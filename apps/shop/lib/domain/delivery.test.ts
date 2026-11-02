import { describe, expect, test } from "bun:test"

import {
  assertFulfillment,
  deliveryDetails,
  deliveryList,
  displayStatus,
  fulfillmentOf,
  pickSlot,
  slotPlacesTaken,
  slotState,
} from "./delivery"
import { ShopError } from "./errors"
import { campaign, order, variant } from "./fixtures"
import { applyCommand } from "./lifecycle"
import { onlineWindowState, refundDue } from "./order"
import { availability } from "./stock"
import type { Delivery, DeliverySlot } from "./types"

/* Delivery and Pickup: slots, the fee, couriers, and campaigns without a booth. */

const slot = (overrides: Partial<DeliverySlot> = {}): DeliverySlot => ({
  id: "sabtu",
  startsAt: new Date(1000),
  endsAt: new Date(2000),
  maxOrders: 2,
  ...overrides,
})
const delivery = (overrides: Partial<Delivery> = {}): Delivery => ({
  address: "SZU 斋区 5栋 302",
  slot: slot(),
  feeFen: 500,
  ...overrides,
})
const staff = { uid: "s1", role: "booth" as const }

function expectCode(run: () => unknown, code: ShopError["code"]) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ShopError)
    expect((error as ShopError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}`)
}

describe("slots", () => {
  test("open until they start or fill up; no limit means never full", () => {
    expect(slotState(slot(), 1, new Date(0))).toBe("open")
    expect(slotState(slot(), 2, new Date(0))).toBe("full")
    expect(slotState(slot({ maxOrders: null }), 500, new Date(0))).toBe("open")
    expect(slotState(slot(), 0, new Date(1000))).toBe("started")
  })

  test("live delivery orders take a place; expired, canceled and overdue ones don't", () => {
    const orders = [
      order({ delivery: delivery(), status: "paid" }),
      order({ delivery: delivery(), status: "pending_payment", expiresAt: new Date(500) }),
      order({ delivery: delivery(), status: "pending_payment", expiresAt: new Date(100) }),
      order({ delivery: delivery(), status: "cancelled" }),
      order({ delivery: delivery({ slot: slot({ id: "minggu" }) }), status: "paid" }),
      order({ status: "paid" }),
    ]
    expect(slotPlacesTaken(orders, "sabtu", new Date(200))).toBe(2)
  })

  test("a buyer can only pick a slot the campaign has, still open", () => {
    const c = campaign({ deliverySlots: [slot()] })
    expect(pickSlot(c, "sabtu", 0, new Date(0)).id).toBe("sabtu")
    expectCode(() => pickSlot(c, "sabtu", 2, new Date(0)), "SLOT_UNAVAILABLE")
    expectCode(() => pickSlot(c, "minggu", 0, new Date(0)), "SLOT_UNAVAILABLE")
  })
})

describe("checkout", () => {
  test("an address and a phone, spaces tidied", () => {
    expect(deliveryDetails("  SZU  斋区\n5栋 302 ", "138")).toBe("SZU 斋区 5栋 302")
    expectCode(() => deliveryDetails("SZU 斋区", ""), "INVALID_DELIVERY")
    expectCode(() => deliveryDetails("SZU", "138"), "INVALID_DELIVERY")
    expectCode(() => deliveryDetails("x".repeat(201), "138"), "INVALID_DELIVERY")
  })

  test("only what the campaign offers", () => {
    const c = campaign({ offers: { delivery: false, pickup: true, booth: true } })
    expectCode(() => assertFulfillment(c, "delivery"), "FULFILLMENT_UNAVAILABLE")
    assertFulfillment(c, "pickup")
  })

  test("online ordering needs Delivery or Pickup; dates are optional", () => {
    const now = new Date("2027-04-01T00:00:00+08:00")
    expect(onlineWindowState(campaign(), now)).toBe("closed")
    expect(onlineWindowState(campaign({ onlineClosesAt: null }), now)).toBe("open")
    expect(onlineWindowState(campaign({ onlineOpensAt: new Date(now.getTime() + 1), onlineClosesAt: null }), now)).toBe("not_open")
    expect(onlineWindowState(campaign({ onlineClosesAt: null, offers: { delivery: false, pickup: false, booth: true } }), now)).toBe("closed")
  })
})

describe("delivering", () => {
  test("a courier and tracking number keep the order paid, and show it on its way", () => {
    const paid = order({ delivery: delivery() })
    const { order: sent } = applyCommand(paid, { type: "send_by_courier", courier: " SF ", trackingNumber: "SF1" }, staff, new Date(5))
    expect(sent.status).toBe("paid")
    expect(sent.delivery).toMatchObject({ courier: "SF", trackingNumber: "SF1", sentAt: new Date(5), sentBy: "s1" })
    expect(displayStatus(paid)).toBe("paid")
    expect(displayStatus(sent)).toBe("sending")
    expectCode(() => applyCommand(paid, { type: "send_by_courier", courier: "SF", trackingNumber: "" }, staff, new Date(5)), "INVALID_COURIER")
    expectCode(() => applyCommand(order(), { type: "send_by_courier", courier: "SF", trackingNumber: "1" }, staff, new Date(5)), "NOT_DELIVERY")
  })

  test("delivered means everything at once", () => {
    const paid = order({ delivery: delivery() })
    expectCode(() => applyCommand(paid, { type: "hand_over", indexes: [0] }, staff, new Date(5)), "DELIVERY_WHOLE")
    const { order: done } = applyCommand(paid, { type: "hand_over" }, staff, new Date(5))
    expect(done.status).toBe("picked_up")
    expect(displayStatus(done)).toBe("delivered")
    // Collected orders can still go in parts.
    expect(applyCommand(order(), { type: "hand_over", indexes: [0] }, staff, new Date(5)).order.status).toBe("paid")
  })

  test("the refund of an undelivered delivery order includes its fee", () => {
    expect(refundDue(order({ delivery: delivery(), status: "cancelled" }))).toBe(11000 + 500)
    expect(refundDue(order({ status: "cancelled" }))).toBe(11000)
  })

  test("the delivery list groups paid delivery orders by slot, earliest first", () => {
    const late = slot({ id: "minggu", startsAt: new Date(3000), endsAt: new Date(4000) })
    const groups = deliveryList([
      order({ id: "b", delivery: delivery({ slot: late }), createdAt: new Date(1) }),
      order({ id: "a", delivery: delivery(), createdAt: new Date(2) }),
      order({ id: "c", delivery: delivery(), createdAt: new Date(1) }),
      order({ id: "d", delivery: delivery(), status: "picked_up" }),
      order({ id: "e" }),
    ])
    expect(groups.map((g) => [g.slot.id, g.orders.map((o) => o.id)])).toEqual([
      ["sabtu", ["c", "a"]],
      ["minggu", ["b"]],
    ])
  })

  test("how each order reaches its buyer", () => {
    expect(fulfillmentOf(order({ delivery: delivery() }))).toBe("delivery")
    expect(fulfillmentOf(order())).toBe("pickup")
    expect(fulfillmentOf(order({ channel: "walkin" }))).toBe("booth")
  })
})

describe("without a booth", () => {
  test("the online cap holds nothing back", () => {
    const v = variant({ stock: 10, onlineCap: 0 })
    expect(availability(v).onlineRemaining).toBe(0)
    expect(availability(v, false).onlineRemaining).toBe(10)
  })
})
