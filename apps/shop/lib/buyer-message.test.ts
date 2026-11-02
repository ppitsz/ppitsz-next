import { describe, expect, test } from "bun:test"

import { courierMessage, rejectionMessage } from "./buyer-message"
import { order } from "./domain/fixtures"

describe("the rejection message", () => {
  const rejected = order({
    status: "pending_payment",
    expiresAt: new Date("2027-03-10T16:30:00+08:00"),
    rejections: [{ reason: "Nominal transfer tidak sesuai", at: new Date(0), by: "admin-1" }],
  })

  test("says why, how much, by when, and links the order", () => {
    const message = rejectionMessage(rejected, "https://shop.test/orders/abc")!
    expect(message).toMatchObject({ name: "A", wechatId: "a" })
    expect(message.text).toContain("transfer proof for order GC-AAAA: Nominal transfer tidak sesuai.")
    expect(message.text).toContain("¥110")
    expect(message.text).toContain("at 16:30 Shenzhen time")
    expect(message.text).toContain("\nhttps://shop.test/orders/abc\n")
  })

  test("only while the buyer still has to act on it", () => {
    expect(rejectionMessage({ ...rejected, status: "awaiting_verification" }, "x")).toBeNull()
    expect(rejectionMessage({ ...rejected, rejections: [] }, "x")).toBeNull()
    expect(rejectionMessage({ ...rejected, buyer: null }, "x")).toBeNull()
  })
})

describe("the courier message", () => {
  const slot = { id: "s", startsAt: new Date(0), endsAt: new Date(1), maxOrders: null }
  const sent = order({
    delivery: { address: "SZU", slot, feeFen: 0, courier: "SF Express", trackingNumber: "SF123", sentAt: new Date(0) },
  })

  test("names the courier and the tracking number, and links the order", () => {
    const message = courierMessage(sent, "https://shop.test/orders/abc")!
    expect(message.text).toContain("GC-AAAA is on its way with SF Express, tracking number SF123.")
    expect(message.text).toContain("\nhttps://shop.test/orders/abc\n")
  })

  test("only once it went out, and not after it arrived", () => {
    expect(courierMessage({ ...sent, delivery: { ...sent.delivery!, sentAt: undefined } }, "x")).toBeNull()
    expect(courierMessage({ ...sent, status: "picked_up" }, "x")).toBeNull()
    expect(courierMessage(order(), "x")).toBeNull()
  })
})
