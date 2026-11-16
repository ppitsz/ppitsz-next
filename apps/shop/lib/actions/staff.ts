"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { z } from "zod"

import { endSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"

import { failure, messageOf, type ActionState } from "./state"
import { slotLabel } from "../campaign-copy"
import { displayStatus, type ShownStatus } from "../domain/delivery"
import { courierMessage, rejectionMessage } from "../buyer-message"
import { requireStaff } from "../server/auth"
import { parseCart } from "../domain/cart"
import { ERROR_MESSAGES } from "../domain/errors"
import { can, type StaffActor } from "../domain/lifecycle"
import { parseScan } from "../domain/order"
import { PAYMENT_METHODS, type Order, type OrderStatus, type PaymentMethod } from "../domain/types"
import { orderPath } from "../order-path"
import { reportError } from "../server/alerts"
import { CAMPAIGN_COOKIE, CAMPAIGN_COOKIE_MAX_AGE } from "../server/dashboard-campaign"
import { clientIp } from "../server/request-meta"
import { siteOrigin } from "../server/site-url"
import { staffNames } from "../server/staff"
import {
  approvePayment,
  cancelOrder,
  createWalkInSale,
  findOrderByCode,
  getCampaign,
  getOrder,
  getOrderByToken,
  recordRefund,
  redeemOrder,
  rejectPayment,
  sendByCourier,
} from "../store"
import { allowRequest, LIMITS } from "../store/rate-limit"

/*
 * Staff server actions. Each one checks the session itself, since a server
 * action is a public endpoint whatever page renders it. What each role may
 * do is decided by the order lifecycle (lib/domain/lifecycle.ts).
 */

/** A reason typed in a dialog shows its error under the reason field. */
const REASON_FIELD = { REASON_REQUIRED: "reason" } as const

/* -------------------------------------------------------------------------
   Session
   ------------------------------------------------------------------------- */

/** Signs out of every app (ADR 0008), back to signing in to the dashboard. */
export async function signOutAction() {
  await endSession()
  redirect(signInUrl(`${await siteOrigin()}/staff`))
}

/* -------------------------------------------------------------------------
   Orders
   ------------------------------------------------------------------------- */

export async function approveAction(orderId: string): Promise<ActionState> {
  const staff = await requireStaff()
  try {
    await approvePayment(String(orderId), staff)
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/staff", "layout")
  return { done: Date.now() }
}

export async function rejectAction(
  orderId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const staff = await requireStaff()
  let order: Order
  try {
    order = await rejectPayment(String(orderId), staff, String(formData.get("reason") ?? ""))
  } catch (error) {
    return failure(error, REASON_FIELD)
  }
  revalidatePath("/staff", "layout")
  const buyerMessage = rejectionMessage(order, `${await siteOrigin()}${orderPath(order.token)}`)
  return { done: Date.now(), buyerMessage: buyerMessage ?? undefined }
}

/** Records money sent back for a canceled or expired online order (admins only, by the lifecycle). */
export async function refundAction(
  orderId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const staff = await requireStaff()
  const amount = Number(String(formData.get("amount") ?? "").replace(",", ".").trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    return { fieldErrors: { amount: "Write the amount refunded in yuan, like 88 or 12.5." } }
  }
  const method = String(formData.get("method") ?? "")
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
    return { fieldErrors: { method: "Choose how the money was refunded." } }
  }
  try {
    await recordRefund(String(orderId), staff, {
      amountFen: Math.round(amount * 100),
      method: method as PaymentMethod,
      note: String(formData.get("note") ?? ""),
    })
  } catch (error) {
    return failure(error, { INVALID_REFUND: "amount" })
  }
  revalidatePath("/staff", "layout")
  revalidatePath("/orders", "layout")
  return { done: Date.now() }
}

/* -------------------------------------------------------------------------
   Delivering delivery orders (every staff role)
   ------------------------------------------------------------------------- */

/** A delivery order handed to a courier. Returns the WeChat message with the tracking number. */
export async function sendByCourierAction(
  orderId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const staff = await requireStaff()
  let order: Order
  try {
    order = await sendByCourier(String(orderId), staff, {
      courier: String(formData.get("courier") ?? ""),
      trackingNumber: String(formData.get("trackingNumber") ?? ""),
    })
  } catch (error) {
    return failure(error, { INVALID_COURIER: "trackingNumber" })
  }
  revalidatePath("/staff", "layout")
  const buyerMessage = courierMessage(order, `${await siteOrigin()}${orderPath(order.token)}`)
  return { done: Date.now(), buyerMessage: buyerMessage ?? undefined }
}

/** A delivery order reached the buyer: every item handed over at once. */
export async function markDeliveredAction(orderId: string): Promise<ActionState> {
  const staff = await requireStaff()
  try {
    await redeemOrder(String(orderId), staff)
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/staff", "layout")
  return { done: Date.now() }
}

/** Admins cancel any open order or sale; booth staff only their own recent register sale. */
export async function cancelAction(
  orderId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const staff = await requireStaff()
  try {
    await cancelOrder(String(orderId), staff, String(formData.get("reason") ?? ""))
  } catch (error) {
    return failure(error, REASON_FIELD)
  }
  revalidatePath("/staff", "layout")
  return { done: Date.now() }
}

/* -------------------------------------------------------------------------
   The dashboard's campaign (lib/server/dashboard-campaign.ts)
   ------------------------------------------------------------------------- */

/** Switches the campaign that Register, Products, Recap and Settings work on, on this device. */
export async function pickCampaignAction(campaignId: string): Promise<ActionState> {
  await requireStaff()
  const campaign = await getCampaign(String(campaignId))
  if (!campaign) return { error: "This campaign no longer exists. Reload the page." }
  ;(await cookies()).set(CAMPAIGN_COOKIE, campaign.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/staff",
    maxAge: CAMPAIGN_COOKIE_MAX_AGE,
  })
  revalidatePath("/staff", "layout")
  return { done: Date.now() }
}

/* -------------------------------------------------------------------------
   Register: walk-in sales at the booth (every staff role)
   ------------------------------------------------------------------------- */

const saleSchema = z.object({
  campaignId: z.string().min(1).max(100),
  saleId: z.uuid(),
  method: z.enum(["cash", "wechat", "alipay"]),
  accountId: z.string().max(40).optional(),
  lines: z.unknown(),
})

export interface SaleSummary {
  id: string
  code: string
  totalFen: number
  method: PaymentMethod
  items: string
  at: Date
}

export type SaleResult = { ok: true; sale: SaleSummary } | { ok: false; error: string }

/**
 * Records a walk-in sale and takes its stock at once. `saleId` is made by
 * the register screen per sale, so a double tap or a retry sells only once.
 */
export async function sellAction(input: z.input<typeof saleSchema>): Promise<SaleResult> {
  const staff = await requireStaff()
  const parsed = saleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "The sale isn't complete. Reload the register." }

  try {
    const { campaignId, method, accountId, lines, saleId } = parsed.data
    const order = await createWalkInSale({ campaignId, lines: parseCart(lines), method, accountId, saleId }, staff)
    return {
      ok: true,
      sale: {
        id: order.id,
        code: order.code,
        totalFen: order.totalFen,
        method,
        items: order.items
          .map((i) => `${i.qty}× ${i.name}${i.variantLabel ? ` ${i.variantLabel}` : ""}`)
          .join(", "),
        at: order.createdAt,
      },
    }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  } finally {
    // Fresh stock for this register, and for the other pages, even after a refusal.
    revalidatePath("/staff", "layout")
  }
}

/** Undoes a register mistake: the sale is canceled and its stock returns. */
export async function undoSaleAction(orderId: string): Promise<ActionState> {
  const staff = await requireStaff()
  try {
    await cancelOrder(String(orderId), staff, "Undone at the register")
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/staff", "layout")
  return { done: Date.now() }
}

/* -------------------------------------------------------------------------
   Booth scanner (every staff role)
   ------------------------------------------------------------------------- */

/** What the scanner shows: enough to hand over, nothing the booth doesn't need. */
export interface ScannedOrder {
  id: string
  code: string
  status: OrderStatus
  buyerName: string | null
  wechatId: string | null
  items: { name: string; variantLabel: string; qty: number; pickedUp: boolean }[]
  totalFen: number
  pickedUpAt: Date | null
  handledByName: string | null
  campaignName: string
  /** The status as shown: "On its way" for a delivery order with a courier. */
  shownStatus: ShownStatus
  /** Placed by staff in a draft campaign. */
  test: boolean
  /** A delivery order is handed over whole; its slot and address, for the booth to see. */
  delivery: { slot: string; address: string } | null
  /** This staff member may hand over its items now. */
  canHandOver: boolean
  /** This staff member may approve or reject its proof. */
  canVerify: boolean
}

export type ScanResult =
  | { ok: true; order: ScannedOrder; handedOver?: number }
  | { ok: false; error: string; order?: ScannedOrder }

/** Finds the order behind a scanned QR or a typed code. */
export async function lookupScanAction(input: string): Promise<ScanResult> {
  const staff = await requireStaff()
  const parsed = parseScan(String(input).slice(0, 500))
  if (!parsed) {
    return { ok: false, error: "This isn't a PPITSZ Shop QR code or order code." }
  }
  try {
    const order =
      "token" in parsed ? await getOrderByToken(parsed.token) : await findOrderByCode(parsed.code)
    if (!order) return { ok: false, error: "Order not found. Check the code again." }
    return { ok: true, order: await toScanned(order, staff) }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}

/** Hands over the items at `indexes`. On a refusal, returns the order as it is now. */
export async function handOverAction(orderId: string, indexes: number[]): Promise<ScanResult> {
  const staff = await requireStaff()
  const wanted = Array.isArray(indexes)
    ? indexes.filter((i) => Number.isInteger(i) && i >= 0 && i < 100)
    : []
  if (wanted.length === 0) return { ok: false, error: "Choose the items to hand over first." }
  try {
    const { order, handedOver } = await redeemOrder(String(orderId), staff, wanted)
    revalidatePath("/staff", "layout")
    return {
      ok: true,
      order: await toScanned(order, staff),
      handedOver: handedOver.reduce((sum, i) => sum + order.items[i]!.qty, 0),
    }
  } catch (error) {
    const current = await getOrder(String(orderId)).catch(() => null)
    return {
      ok: false,
      error: messageOf(error),
      order: current ? await toScanned(current, staff) : undefined,
    }
  }
}

async function toScanned(order: Order, staff: StaffActor): Promise<ScannedOrder> {
  const [names, campaign] = await Promise.all([staffNames([order.handledBy]), getCampaign(order.campaignId)])
  const now = new Date()
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    buyerName: order.buyer?.name ?? null,
    wechatId: order.buyer?.wechatId ?? null,
    items: order.items.map(({ name, variantLabel, qty, pickedUp }) => ({
      name,
      variantLabel,
      qty,
      pickedUp,
    })),
    totalFen: order.totalFen,
    pickedUpAt: order.pickedUpAt,
    handledByName: order.handledBy ? (names.get(order.handledBy) ?? "staff") : null,
    campaignName: campaign?.name ?? "Deleted campaign",
    shownStatus: displayStatus(order),
    test: !!order.test,
    delivery: order.delivery ? { slot: slotLabel(order.delivery.slot), address: order.delivery.address } : null,
    canHandOver: can(order, "hand_over", staff, now),
    canVerify: can(order, "approve", staff, now),
  }
}
