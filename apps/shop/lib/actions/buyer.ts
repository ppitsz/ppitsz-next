"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { endSession } from "@ppitsz/accounts/session"

import { failure, type ActionState } from "./state"
import { parseCart } from "../domain/cart"
import { cleanProfile } from "../domain/account"
import { ERROR_MESSAGES } from "../domain/errors"
import { orderPath } from "../order-path"
import { reportError } from "../server/alerts"
import { getBuyer, getStaff } from "../server/auth"
import { clientIp, deviceId, deviceKeyOf } from "../server/request-meta"
import { allowRequest, LIMITS } from "../store/rate-limit"
import { createOnlineOrder, findOrderByCheckout, saveBuyerProfile, submitPaymentProof } from "../store"

/*
 * Buyer-side server actions. Ordering needs a signed-in account; an order's
 * page and its proof upload are reached through its secret token, so those
 * actions trust nothing but the token and re-check everything against the
 * database.
 */

/** Signs out of every app (ADR 0008), back to the shop. */
export async function buyerSignOutAction() {
  await endSession()
  redirect("/")
}

const checkoutSchema = z.object({
  campaignId: z.string().min(1).max(100),
  name: z.string().max(200),
  wechatId: z.string().max(200),
  phone: z.string().max(200),
  cart: z.string().max(10_000),
  checkoutId: z.string().max(64),
  fulfillment: z.enum(["delivery", "pickup"]),
  address: z.string().max(1000),
  slotId: z.string().max(100),
  pointId: z.string().max(100),
})

export async function createOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const account = await getBuyer()
  if (!account) return { error: ERROR_MESSAGES.SIGN_IN_REQUIRED }
  const text = (name: string) => {
    const value = formData.get(name)
    return typeof value === "string" ? value : ""
  }
  const parsed = checkoutSchema.safeParse({
    name: text("name"),
    wechatId: text("wechatId"),
    phone: text("phone"),
    campaignId: text("campaignId"),
    cart: text("cart"),
    checkoutId: text("checkoutId"),
    fulfillment: text("fulfillment") || "pickup",
    address: text("address"),
    slotId: text("slotId"),
    pointId: text("pointId"),
  })
  if (!parsed.success) return { error: "The order details aren't complete. Reload the page." }
  const { profile, issues } = cleanProfile(parsed.data)
  const fieldErrors: ActionState["fieldErrors"] = { ...issues }
  const { fulfillment, address, slotId, pointId } = parsed.data
  if (fulfillment === "delivery") {
    if (address.trim().length < 5) fieldErrors.address = "Write the full address, with building and room number."
    if (!profile.phone) fieldErrors.phone ??= "Write a phone number for the person delivering."
    if (!slotId) fieldErrors.slotId = "Choose a delivery slot."
  } else if (!pointId) {
    fieldErrors.pointId = "Choose a pickup point."
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  const device = await deviceId()
  const allowed = await allowRequest([
    { key: `checkout:device:${device}`, limit: LIMITS.checkoutPerDevice },
    { key: `checkout:ip:${await clientIp()}`, limit: LIMITS.checkoutPerIp },
  ])
  if (!allowed) return { error: ERROR_MESSAGES.RATE_LIMITED }

  let token: string
  try {
    const order = await createOnlineOrder({
      campaignId: parsed.data.campaignId,
      buyer: { uid: account.uid, email: account.email, ...profile },
      lines: parseCart(parseJson(parsed.data.cart)),
      fulfillment: fulfillment === "delivery" ? { type: "delivery", address, slotId } : { type: "pickup", pointId },
      checkoutId: parsed.data.checkoutId,
      deviceKey: deviceKeyOf(device),
      staff: !!(await getStaff()),
    })
    token = order.token
  } catch (error) {
    return failure(error, {
      SLOT_UNAVAILABLE: "slotId",
      INVALID_DELIVERY: "address",
      PICKUP_POINT_UNAVAILABLE: "pointId",
      NOT_AT_PICKUP_POINT: "pointId",
    })
  }
  // The next checkout starts from what was typed here. The order is made either way.
  await saveBuyerProfile(account, profile).catch((error: unknown) => reportError(error, "save buyer profile"))

  redirect(`${orderPath(token)}?new=1`)
}

/**
 * After a reload mid-checkout: did this checkout attempt already create an
 * order? Returns its link if so. The id is a random UUID only this browser knows.
 */
export async function lookupCheckoutAction(checkoutId: string): Promise<string | null> {
  const order = await findOrderByCheckout(checkoutId)
  return order ? orderPath(order.token) : null
}

export async function submitProofAction(
  token: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("proof")
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { proof: "Choose a screenshot of your transfer." } }
  }
  if (!(await allowRequest([{ key: `proof:${token}`, limit: LIMITS.proofPerOrder }]))) {
    return { error: ERROR_MESSAGES.RATE_LIMITED }
  }

  const accountId = formData.get("accountId")
  const transactionDigits = formData.get("transactionDigits")
  try {
    await submitPaymentProof({
      token,
      file: { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type },
      accountId: typeof accountId === "string" ? accountId : undefined,
      transactionDigits: typeof transactionDigits === "string" ? transactionDigits.slice(0, 100) : undefined,
    })
  } catch (error) {
    return failure(error, { INVALID_ACCOUNT: "accountId", INVALID_FILE: "proof", INVALID_TRANSACTION_DIGITS: "transactionDigits" })
  }

  redirect(orderPath(token))
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
