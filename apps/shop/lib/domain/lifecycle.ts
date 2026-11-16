import type { StaffRole } from "../staff-roles"
import { MAX_COURIER_LENGTH, MAX_TRACKING_LENGTH } from "./delivery"
import { ShopError, type ErrorCode } from "./errors"
import { isOpenStatus, isPastDeadline, paymentDeadline } from "./order"
import { proofAccount, proofTransactionDigits } from "./payment"
import { PAYMENT_METHODS, type Campaign, type Order, type OrderItem, type OrderStatus, type PaymentMethod } from "./types"

/*
 * Every change to an existing order goes through applyCommand: who may do
 * what, from which status, and what the order looks like afterwards. The
 * store runs it inside a transaction and writes back what it returns; pages
 * ask `can` to decide which buttons to show.
 *
 * pending_payment ──submit_proof──▶ awaiting_verification ──approve──▶ paid ──hand_over──▶ picked_up
 *        ▲                                   │
 *        └──────────────reject───────────────┘
 * a paid delivery order ──send_by_courier──▶ paid, with the courier and tracking number
 * A delivery order is handed over whole, and hand_over then means delivered.
 * pending_payment past its deadline ──expire──▶ expired
 * any open order, or a walk-in sale ──cancel──▶ canceled
 * a canceled or expired online order ──record_refund──▶ the same status, with the refund on record
 */

/** Who is asking. Buyers are anonymous: holding the token is enough. */
export type Actor = "buyer" | "system" | StaffActor

export interface StaffActor {
  uid: string
  role: StaffRole
}

export type OrderCommand =
  | {
      type: "submit_proof"
      campaign: Campaign
      accountId: string | undefined
      /** As the buyer typed it; required for WeChat Pay and Alipay. */
      transactionDigits: string | undefined
      proofPath: string
    }
  | { type: "approve" }
  | { type: "reject"; campaign: Campaign; reason: string }
  /** The items at `indexes`, or every item not yet handed over. */
  | { type: "hand_over"; indexes?: number[] }
  | { type: "send_by_courier"; courier: string; trackingNumber: string }
  | { type: "cancel"; reason: string }
  | { type: "expire" }
  | { type: "record_refund"; amountFen: number; method: PaymentMethod; note: string }

export type CommandType = OrderCommand["type"]

export interface Transition {
  order: Order
  /** Items whose units go back to stock. */
  released: OrderItem[]
  /** Indexes of the items this command handed over. */
  handedOver: number[]
}

/** Booth staff can undo their own walk-in sale for this long; admins any time. */
export const SALE_UNDO_WINDOW_MS = 30 * 60_000

/** Longest reason staff may give for a rejection or cancellation. */
export const MAX_REASON_LENGTH = 200

/** True when `actor` may run `type` on `order` now. */
export function can(order: Order, type: CommandType, actor: Actor, now: Date) {
  return refusal(order, type, actor, now) === null
}

/** Why `actor` may not run `type` on `order` now, or null when they may. */
export function refusal(order: Order, type: CommandType, actor: Actor, now: Date): ErrorCode | null {
  // An unpaid order past its deadline is expired, whether or not it has been settled yet.
  if (isPastDeadline(order, now)) return type === "expire" ? null : "ORDER_EXPIRED"

  switch (type) {
    case "submit_proof":
      if (actor !== "buyer") return "NOT_ALLOWED"
      return order.status === "pending_payment" ? null : statusRefusal(order.status)

    case "approve":
    case "reject":
      if (order.status !== "awaiting_verification") return statusRefusal(order.status)
      return isAdmin(actor) ? null : "NOT_ALLOWED"

    case "hand_over":
      if (!isStaff(actor)) return "NOT_ALLOWED"
      if (order.status === "paid") return null
      if (order.status === "pending_payment" || order.status === "awaiting_verification") return "NOT_PAID"
      return statusRefusal(order.status)

    case "send_by_courier":
      if (!isStaff(actor)) return "NOT_ALLOWED"
      if (!order.delivery) return "NOT_DELIVERY"
      if (order.status === "paid") return null
      if (order.status === "pending_payment" || order.status === "awaiting_verification") return "NOT_PAID"
      return statusRefusal(order.status)

    case "cancel": {
      const sale = isWalkInSale(order)
      if (!sale && !isOpenStatus(order.status)) return statusRefusal(order.status)
      if (!isStaff(actor)) return "NOT_ALLOWED"
      if (actor.role === "admin") return null
      if (!sale) return "NOT_ALLOWED"
      const own = order.handledBy === actor.uid
      const recent = now.getTime() - order.createdAt.getTime() <= SALE_UNDO_WINDOW_MS
      return own && recent ? null : "SALE_LOCKED"
    }

    case "expire":
      return "INVALID_TRANSITION"

    case "record_refund":
      // A walk-in sale undone at the booth is settled there and then.
      if (order.channel !== "online") return "INVALID_TRANSITION"
      if (order.status !== "cancelled" && order.status !== "expired") return statusRefusal(order.status)
      if (order.refund) return "ALREADY_REFUNDED"
      return isAdmin(actor) ? null : "NOT_ALLOWED"
  }
}

/** Runs `command` on `order`, or throws the refusal as a ShopError. */
export function applyCommand(order: Order, command: OrderCommand, actor: Actor, now: Date): Transition {
  const refused = refusal(order, command.type, actor, now)
  if (refused) throw new ShopError(refused)
  const unchanged = { released: [], handedOver: [] }

  switch (command.type) {
    case "submit_proof": {
      const account = proofAccount(command.campaign, command.accountId)
      const transactionDigits = proofTransactionDigits(account, command.transactionDigits)
      return {
        ...unchanged,
        order: {
          ...order,
          status: "awaiting_verification",
          expiresAt: null,
          payment: {
            method: account.method,
            accountId: account.id,
            proofPath: command.proofPath,
            transactionDigits,
            submittedAt: now,
          },
        },
      }
    }

    case "approve":
      return {
        ...unchanged,
        order: {
          ...order,
          status: "paid",
          expiresAt: null,
          payment: { ...order.payment, verifiedAt: now, verifiedBy: staffUid(actor) },
        },
      }

    case "reject":
      return {
        ...unchanged,
        order: {
          ...order,
          status: "pending_payment",
          expiresAt: paymentDeadline(command.campaign, now),
          rejections: [
            ...order.rejections,
            {
              reason: reasonOf(command.reason),
              at: now,
              by: staffUid(actor),
              proofPath: order.payment.proofPath,
              transactionDigits: order.payment.transactionDigits,
            },
          ],
        },
      }

    case "hand_over":
      return handOver(order, command.indexes, staffUid(actor), now)

    case "send_by_courier": {
      const courier = command.courier.trim()
      const trackingNumber = command.trackingNumber.trim()
      const valid =
        courier && trackingNumber && courier.length <= MAX_COURIER_LENGTH && trackingNumber.length <= MAX_TRACKING_LENGTH
      if (!valid) throw new ShopError("INVALID_COURIER")
      const delivery = { ...order.delivery!, courier, trackingNumber, sentAt: now, sentBy: staffUid(actor) }
      return { ...unchanged, order: { ...order, delivery } }
    }

    case "cancel": {
      const reason = reasonOf(command.reason)
      // A walk-in sale was handed over at once; undoing it returns every unit.
      const released = isWalkInSale(order) ? order.items : order.items.filter((item) => !item.pickedUp)
      return {
        order: { ...order, status: "cancelled", cancelReason: reason, cancelledBy: staffUid(actor), cancelledAt: now },
        released,
        handedOver: [],
      }
    }

    case "record_refund": {
      const { amountFen, method } = command
      const valid = Number.isInteger(amountFen) && amountFen >= 1 && amountFen <= order.totalFen
      if (!valid || !PAYMENT_METHODS.includes(method)) throw new ShopError("INVALID_REFUND")
      const note = command.note.trim().slice(0, MAX_REASON_LENGTH)
      return {
        ...unchanged,
        order: { ...order, refund: { amountFen, method, note, at: now, by: staffUid(actor) } },
      }
    }

    case "expire":
      return {
        order: { ...order, status: "expired" },
        released: order.items.filter((item) => !item.pickedUp),
        handedOver: [],
      }
  }
}

function handOver(order: Order, indexes: number[] | undefined, uid: string, now: Date): Transition {
  const wanted = new Set(indexes ?? order.items.map((_, i) => i))
  if (order.delivery && order.items.some((item, i) => !item.pickedUp && !wanted.has(i))) {
    throw new ShopError("DELIVERY_WHOLE")
  }
  const handedOver: number[] = []
  const items = order.items.map((item, i) => {
    if (!wanted.has(i) || item.pickedUp) return item
    handedOver.push(i)
    return { ...item, pickedUp: true }
  })
  if (handedOver.length === 0) throw new ShopError("ALREADY_PICKED_UP")

  return {
    order: {
      ...order,
      items,
      status: items.every((item) => item.pickedUp) ? "picked_up" : "paid",
      pickedUpAt: now,
      handledBy: uid,
    },
    released: [],
    handedOver,
  }
}

function isWalkInSale(order: Order) {
  return order.channel === "walkin" && order.status === "picked_up"
}

function statusRefusal(status: OrderStatus): ErrorCode {
  if (status === "expired") return "ORDER_EXPIRED"
  if (status === "picked_up") return "ALREADY_PICKED_UP"
  return "INVALID_TRANSITION"
}

function isStaff(actor: Actor): actor is StaffActor {
  return typeof actor === "object"
}

function isAdmin(actor: Actor) {
  return isStaff(actor) && actor.role === "admin"
}

function staffUid(actor: Actor) {
  if (!isStaff(actor)) throw new Error("Only staff commands record a uid")
  return actor.uid
}

function reasonOf(text: string) {
  const reason = text.trim().slice(0, MAX_REASON_LENGTH)
  if (!reason) throw new ShopError("REASON_REQUIRED")
  return reason
}
