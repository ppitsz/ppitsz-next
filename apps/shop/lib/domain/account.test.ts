import { describe, expect, test } from "bun:test"

import { cleanProfile, ordersSummary, safeNext, splitOrders } from "./account"
import { order as makeOrder } from "./fixtures"
import type { Order } from "./types"

describe("profile", () => {
  test("trimmed, with a name and WeChat ID required and the phone optional", () => {
    expect(cleanProfile({ name: "  Budi ", wechatId: " budi_sz ", phone: "" })).toEqual({
      profile: { name: "Budi", wechatId: "budi_sz", phone: "" },
      issues: {},
    })
    expect(Object.keys(cleanProfile({ name: "B", wechatId: " ", phone: "abc" }).issues)).toEqual([
      "name",
      "wechatId",
      "phone",
    ])
    expect(cleanProfile({ name: "Budi", wechatId: "b", phone: "+86 (138) 0000-0000" }).issues).toEqual({})
  })

})

describe("after signing in", () => {
  test("only a path on this site", () => {
    expect(safeNext("/gumamchan/checkout")).toBe("/gumamchan/checkout")
    expect(safeNext("https://evil.test")).toBe("/")
    expect(safeNext("//evil.test")).toBe("/")
    expect(safeNext("/\\evil.test")).toBe("/")
    expect(safeNext(undefined, "/orders")).toBe("/orders")
  })
})

describe("an account's orders", () => {
  const at = (minutes: number) => new Date(Date.UTC(2027, 2, 5, 4, minutes))
  const order = (id: string, status: Order["status"], minutes: number, patch: Partial<Order> = {}) =>
    makeOrder({ id, status, createdAt: at(minutes), ...patch })
  const delivery = {
    address: "SZU",
    slot: { id: "s", startsAt: at(0), endsAt: at(60), maxOrders: null },
    feeFen: 500,
  }

  test("Active while still moving, Done after; newest first", () => {
    const { active, done } = splitOrders([
      order("a", "picked_up", 1),
      order("b", "pending_payment", 2),
      order("c", "paid", 3),
      order("d", "cancelled", 4),
      order("e", "awaiting_verification", 5),
      order("f", "expired", 6),
    ])
    expect(active.map((o) => o.id)).toEqual(["e", "c", "b"])
    expect(done.map((o) => o.id)).toEqual(["f", "d", "a"])
  })

  test("the greeting names the most urgent things first", () => {
    expect(ordersSummary([])).toBe("No orders in progress.")
    expect(ordersSummary([order("a", "paid", 1)])).toBe("1 order ready to pick up.")
    expect(
      ordersSummary([
        order("a", "pending_payment", 1),
        order("b", "paid", 2),
        order("c", "pending_payment", 3),
        order("d", "paid", 4, { delivery }),
        order("e", "paid", 5, { delivery: { ...delivery, sentAt: at(10) } }),
      ])
    ).toBe("1 order ready to pick up, 1 on its way, 2 waiting for payment, 1 waiting for delivery.")
  })
})
