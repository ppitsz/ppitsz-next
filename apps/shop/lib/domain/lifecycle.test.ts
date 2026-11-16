import { describe, expect, test } from "bun:test"

import { ShopError, type ErrorCode } from "./errors"
import { campaign, order } from "./fixtures"
import { applyCommand, can, type Actor, type OrderCommand } from "./lifecycle"
import { awaitsRefund, refundDue, stockUnits } from "./order"
import type { Order } from "./types"

/* Every status change, through the one interface the store and the pages use. */

const NOW = new Date("2027-03-17T12:00:00+08:00")
const admin = { uid: "admin-1", role: "admin" as const }
const booth = { uid: "booth-1", role: "booth" as const }

function refused(o: Order, command: OrderCommand, actor: Actor, code: ErrorCode, now = NOW) {
  try {
    applyCommand(o, command, actor, now)
  } catch (error) {
    expect(error).toBeInstanceOf(ShopError)
    expect((error as ShopError).code).toBe(code)
    // These depend on what was typed, not on the order, so the button still shows.
    const typed: ErrorCode[] = ["REASON_REQUIRED", "INVALID_ACCOUNT", "INVALID_TRANSACTION_DIGITS", "INVALID_REFUND"]
    expect(can(o, command.type, actor, now)).toBe(typed.includes(code))
    return
  }
  throw new Error(`Expected ${code}, but the command ran`)
}

const unpaid = (overrides: Partial<Order> = {}) =>
  order({ status: "pending_payment", expiresAt: new Date(NOW.getTime() + 60_000), ...overrides })
const awaiting = (overrides: Partial<Order> = {}) =>
  order({
    status: "awaiting_verification",
    payment: {
      method: "wechat",
      accountId: "wx",
      proofPath: "proofs/o1/1.png",
      transactionDigits: "567890",
      submittedAt: NOW,
    },
    ...overrides,
  })
const proof = (accountId = "wx", transactionDigits: string | undefined = "901234"): OrderCommand => ({
  type: "submit_proof",
  campaign: campaign(),
  accountId,
  transactionDigits,
  proofPath: "proofs/o1/2.png",
})

describe("payment proof", () => {
  test("the buyer's proof waits for verification, paid to the account they chose", () => {
    const { order: next } = applyCommand(unpaid(), proof("ali"), "buyer", NOW)
    expect(next.status).toBe("awaiting_verification")
    expect(next.expiresAt).toBeNull()
    expect(next.payment).toEqual({
      method: "alipay",
      accountId: "ali",
      proofPath: "proofs/o1/2.png",
      transactionDigits: "901234",
      submittedAt: NOW,
    })
  })

  test("a WeChat Pay or Alipay proof needs the transaction number", () => {
    refused(unpaid(), proof("wx", ""), "buyer", "INVALID_TRANSACTION_DIGITS")
    refused(unpaid(), proof("ali", "GC-7K3P"), "buyer", "INVALID_TRANSACTION_DIGITS")
  })

  test("needs one of the campaign's accounts", () => {
    refused(unpaid(), proof("someone-else"), "buyer", "INVALID_ACCOUNT")
  })

  test("only while waiting for payment, and not past the deadline", () => {
    refused(awaiting(), proof(), "buyer", "INVALID_TRANSITION")
    refused(unpaid({ expiresAt: new Date(NOW.getTime() - 1) }), proof(), "buyer", "ORDER_EXPIRED")
    refused(order({ status: "expired" }), proof(), "buyer", "ORDER_EXPIRED")
  })

  test("staff can't submit a proof for the buyer", () => {
    refused(unpaid(), proof(), admin, "NOT_ALLOWED")
  })
})

describe("verification", () => {
  test("an admin approves a proof", () => {
    const { order: next } = applyCommand(awaiting(), { type: "approve" }, admin, NOW)
    expect(next.status).toBe("paid")
    expect(next.payment).toMatchObject({ proofPath: "proofs/o1/1.png", verifiedAt: NOW, verifiedBy: "admin-1" })
  })

  test("there must be a proof to approve", () => {
    refused(unpaid(), { type: "approve" }, admin, "INVALID_TRANSITION")
    refused(unpaid({ expiresAt: new Date(0) }), { type: "approve" }, admin, "ORDER_EXPIRED")
  })

  test("booth staff can't verify", () => {
    refused(awaiting(), { type: "approve" }, booth, "NOT_ALLOWED")
    refused(awaiting(), { type: "reject", campaign: campaign(), reason: "Kurang" }, booth, "NOT_ALLOWED")
  })

  test("a rejection sends the order back with a new deadline and stays on record", () => {
    const reject: OrderCommand = { type: "reject", campaign: campaign(), reason: "  Nominal kurang ¥5 " }
    const { order: next } = applyCommand(awaiting(), reject, admin, NOW)
    expect(next.status).toBe("pending_payment")
    expect(next.expiresAt!.getTime()).toBe(NOW.getTime() + 120 * 60_000)
    expect(next.rejections).toEqual([
      {
        reason: "Nominal kurang ¥5",
        at: NOW,
        by: "admin-1",
        proofPath: "proofs/o1/1.png",
        transactionDigits: "567890",
      },
    ])

    // The next proof replaces the payment but keeps the rejection.
    const later = new Date(NOW.getTime() + 60_000)
    const resubmitted = applyCommand(next, proof(), "buyer", later).order
    expect(resubmitted.payment.proofPath).toBe("proofs/o1/2.png")
    expect(resubmitted.rejections).toHaveLength(1)
  })

  test("a rejection needs a reason", () => {
    refused(awaiting(), { type: "reject", campaign: campaign(), reason: "   " }, admin, "REASON_REQUIRED")
  })
})

describe("hand-over", () => {
  test("hands over everything by default", () => {
    const result = applyCommand(order(), { type: "hand_over" }, booth, NOW)
    expect(result.order.status).toBe("picked_up")
    expect(result.handedOver).toEqual([0, 1])
    expect(result.order).toMatchObject({ handledBy: "booth-1", pickedUpAt: NOW })
  })

  test("in parts: the order stays paid until the last item", () => {
    const first = applyCommand(order(), { type: "hand_over", indexes: [0] }, booth, NOW)
    expect(first.order.status).toBe("paid")
    const second = applyCommand(first.order, { type: "hand_over" }, booth, NOW)
    expect(second.handedOver).toEqual([1])
    expect(second.order.status).toBe("picked_up")
  })

  test("reports only what this hand-over gave, when another phone was faster", () => {
    const partly = applyCommand(order(), { type: "hand_over", indexes: [1] }, booth, NOW).order
    const result = applyCommand(partly, { type: "hand_over", indexes: [0, 1] }, admin, NOW)
    expect(result.handedOver).toEqual([0])
  })

  test("refuses unpaid, collected and dead orders", () => {
    refused(awaiting(), { type: "hand_over" }, booth, "NOT_PAID")
    refused(unpaid(), { type: "hand_over" }, booth, "NOT_PAID")
    refused(order({ status: "picked_up" }), { type: "hand_over" }, booth, "ALREADY_PICKED_UP")
    refused(order({ status: "expired" }), { type: "hand_over" }, booth, "ORDER_EXPIRED")
    refused(order({ status: "cancelled" }), { type: "hand_over" }, booth, "INVALID_TRANSITION")
  })

  test("asking again for an item already handed over is refused, the rest still can be", () => {
    const handed = applyCommand(order(), { type: "hand_over", indexes: [0] }, booth, NOW).order
    expect(() => applyCommand(handed, { type: "hand_over", indexes: [0] }, booth, NOW)).toThrow("already been picked up")
    expect(can(handed, "hand_over", booth, NOW)).toBe(true)
  })

  test("only staff hand over", () => {
    refused(order(), { type: "hand_over" }, "buyer", "NOT_ALLOWED")
  })
})

describe("canceling", () => {
  const sale = order({
    channel: "walkin",
    buyer: null,
    status: "picked_up",
    handledBy: "booth-1",
    items: order().items.map((item) => ({ ...item, pickedUp: true })),
    createdAt: new Date(NOW.getTime() - 10 * 60_000),
  })
  const cancel: OrderCommand = { type: "cancel", reason: "Salah input" }

  test("booth staff undo only their own sale, within the undo window", () => {
    expect(can(sale, "cancel", booth, NOW)).toBe(true)
    refused(sale, cancel, { ...booth, uid: "booth-2" }, "SALE_LOCKED")
    refused(sale, cancel, booth, "SALE_LOCKED", new Date(NOW.getTime() + 25 * 60_000))
  })

  test("booth staff can't cancel online orders", () => {
    refused(order(), cancel, booth, "NOT_ALLOWED")
  })

  test("admins cancel open orders and any sale, never a finished online order", () => {
    expect(can(sale, "cancel", admin, new Date(NOW.getTime() + 86_400_000))).toBe(true)
    for (const o of [unpaid(), awaiting(), order()]) expect(can(o, "cancel", admin, NOW)).toBe(true)
    refused(order({ status: "picked_up" }), cancel, admin, "ALREADY_PICKED_UP")
    refused(order({ status: "cancelled" }), cancel, admin, "INVALID_TRANSITION")
  })

  test("returns the units not handed over; an undone sale returns all", () => {
    const partly = applyCommand(order(), { type: "hand_over", indexes: [0] }, booth, NOW).order
    const cancelled = applyCommand(partly, cancel, admin, NOW)
    expect(cancelled.order).toMatchObject({
      status: "cancelled",
      cancelledBy: "admin-1",
      cancelledAt: NOW,
      handledBy: "booth-1",
    })
    expect(stockUnits(cancelled.released).map((u) => u.productId)).toEqual(["p2"])
    expect(applyCommand(sale, cancel, booth, NOW).released).toHaveLength(2)
  })

  test("needs a reason", () => {
    refused(order(), { type: "cancel", reason: "" }, admin, "REASON_REQUIRED")
  })
})

describe("expiry", () => {
  test("only an unpaid order past its deadline expires, releasing its units", () => {
    const overdue = unpaid({ expiresAt: new Date(NOW.getTime() - 1) })
    const result = applyCommand(overdue, { type: "expire" }, "system", NOW)
    expect(result.order.status).toBe("expired")
    expect(result.released).toHaveLength(2)
    refused(unpaid(), { type: "expire" }, "system", "INVALID_TRANSITION")
    refused(awaiting({ expiresAt: new Date(0) }), { type: "expire" }, "system", "INVALID_TRANSITION")
  })

  test("an overdue order refuses everything else, even before it is settled", () => {
    const overdue = unpaid({ expiresAt: new Date(NOW.getTime() - 1) })
    refused(overdue, { type: "cancel", reason: "x" }, admin, "ORDER_EXPIRED")
  })
})

describe("refunds", () => {
  const refund = (amountFen = 11000): OrderCommand => ({ type: "record_refund", amountFen, method: "wechat", note: " ref 42 " })
  const paidThenCancelled = (overrides: Partial<Order> = {}) =>
    order({
      status: "cancelled",
      payment: { method: "wechat", accountId: "wx", verifiedAt: NOW, verifiedBy: "admin-1" },
      ...overrides,
    })

  test("an admin records what went back, once, on a canceled or expired online order", () => {
    const { order: next, released } = applyCommand(paidThenCancelled(), refund(), admin, NOW)
    expect(next.status).toBe("cancelled")
    expect(next.refund).toEqual({ amountFen: 11000, method: "wechat", note: "ref 42", at: NOW, by: "admin-1" })
    expect(released).toEqual([])
    refused(next, refund(), admin, "ALREADY_REFUNDED")
    expect(can(order({ status: "expired" }), "record_refund", admin, NOW)).toBe(true)
  })

  test("only admins, only dead online orders, never more than the order's total", () => {
    refused(paidThenCancelled(), refund(), booth, "NOT_ALLOWED")
    refused(order(), refund(), admin, "INVALID_TRANSITION")
    refused(order({ channel: "walkin", status: "cancelled" }), refund(), admin, "INVALID_TRANSITION")
    refused(paidThenCancelled(), refund(11001), admin, "INVALID_REFUND")
    refused(paidThenCancelled(), refund(0), admin, "INVALID_REFUND")
  })

  test("what is owed: the items not handed over, for an order we took money for", () => {
    const partly = paidThenCancelled({ items: order().items.map((item, i) => ({ ...item, pickedUp: i === 0 })) })
    expect(refundDue(partly)).toBe(8000)
    expect(awaitsRefund(partly)).toBe(true)
    expect(awaitsRefund(applyCommand(partly, refund(8000), admin, NOW).order)).toBe(false)
    // Canceled while its proof waited: the buyer says they paid.
    expect(awaitsRefund(order({ status: "cancelled", payment: { submittedAt: NOW } }))).toBe(true)
    // Its last proof was rejected, or it never had one: nothing to send back.
    const rejected = order({
      status: "cancelled",
      payment: { submittedAt: new Date(NOW.getTime() - 60_000) },
      rejections: [{ reason: "x", at: NOW, by: "admin-1" }],
    })
    expect(awaitsRefund(rejected)).toBe(false)
    expect(awaitsRefund(order({ status: "cancelled" }))).toBe(false)
    expect(awaitsRefund(order({ status: "expired", payment: { verifiedAt: NOW } }))).toBe(false)
  })
})
