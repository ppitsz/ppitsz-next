import { describe, expect, test } from "bun:test"

import { ShopError } from "./errors"
import { byId, order, product, variant } from "./fixtures"
import {
  countUnpaid,
  generateOrderCode,
  generateToken,
  isPastDeadline,
  cleanOrderCode,
  orderCodeCandidates,
  openRejection,
  orderVersion,
  parseScan,
  onlineWindowState,
  priceAndReserve,
  releaseItems,
} from "./order"
import { availability, release, reserve } from "./stock"
import type { Campaign } from "./types"

describe("stock", () => {
  test("online orders stop at the cap, walk-ins can use the rest", () => {
    const v = variant({ stock: 10, onlineCap: 6, onlineOrdered: 6 })
    expect(availability(v)).toEqual({ remaining: 4, onlineRemaining: 0 })
    expect(() => reserve(v, 1, "online")).toThrow(ShopError)
    expect(reserve(v, 4, "walkin").walkIn).toBe(4)
    expect(() => reserve(v, 5, "walkin")).toThrow(ShopError)
  })

  test("walk-ins shrink what online orders can take", () => {
    const v = variant({ stock: 10, onlineCap: 6, walkIn: 7 })
    expect(availability(v)).toEqual({ remaining: 3, onlineRemaining: 3 })
  })

  test("no cap means online orders can take everything", () => {
    expect(availability(variant({ onlineCap: null })).onlineRemaining).toBe(10)
  })

  test("stock lowered below sold never goes negative", () => {
    expect(availability(variant({ stock: 2, onlineOrdered: 5 }))).toEqual({
      remaining: 0,
      onlineRemaining: 0,
    })
  })

  test("release gives units back to the right counter", () => {
    const v = variant({ onlineOrdered: 3, walkIn: 2 })
    expect(release(v, 2, "online").onlineOrdered).toBe(1)
    expect(release(v, 2, "walkin").walkIn).toBe(0)
    expect(release(v, 9, "walkin").walkIn).toBe(0)
  })

  test("rejects non-positive and fractional quantities", () => {
    expect(() => reserve(variant(), 0, "online")).toThrow(RangeError)
    expect(() => reserve(variant(), 1.5, "online")).toThrow(RangeError)
  })
})

describe("pricing", () => {
  test("prices from stored products and reserves stock", () => {
    const shirt = product({
      id: "p2",
      name: "Kaos",
      category: "merch",
      variants: [variant({ id: "m", label: "M", priceFen: 8000 }), variant({ id: "l", label: "L", priceFen: 8500 })],
    })
    const result = priceAndReserve(
      [
        { productId: "p1", variantId: "v1", qty: 2 },
        { productId: "p2", variantId: "l", qty: 1 },
      ],
      byId(product(), shirt),
      new Map(),
      "online",
      "c1"
    )
    expect(result.totalFen).toBe(2 * 1500 + 8500)
    expect(result.items.every((i) => !i.pickedUp)).toBe(true)
    const updatedShirt = result.updatedProducts.find((p) => p.id === "p2")!
    expect(updatedShirt.variants.map((v) => v.onlineOrdered)).toEqual([0, 1])
  })

  test("walk-in items count as handed over", () => {
    const result = priceAndReserve([{ productId: "p1", variantId: "v1", qty: 1 }], byId(product()), new Map(), "walkin", "c1")
    expect(result.items[0]!.pickedUp).toBe(true)
    expect(result.updatedProducts[0]!.variants[0]!.walkIn).toBe(1)
  })

  test("inactive, unknown and other campaigns' products are rejected", () => {
    const line = { productId: "p1", variantId: "v1", qty: 1 }
    for (const run of [
      () => priceAndReserve([line], byId(product({ active: false })), new Map(), "online", "c1"),
      () => priceAndReserve([{ ...line, variantId: "nope" }], byId(product()), new Map(), "online", "c1"),
      () => priceAndReserve([line], byId(product()), new Map(), "online", "other"),
    ]) {
      expect(run).toThrow(ShopError)
    }
  })

  test("a seasonal product sells only inside its dates, on either channel", () => {
    const line = { productId: "p1", variantId: "v1", qty: 1 }
    const seasonal = byId(product({ onSaleFrom: new Date(100), onSaleUntil: new Date(200) }))
    for (const channel of ["online", "walkin"] as const) {
      expect(() => priceAndReserve([line], seasonal, new Map(), channel, "c1", { now: new Date(99) })).toThrow(ShopError)
      expect(() => priceAndReserve([line], seasonal, new Map(), channel, "c1", { now: new Date(200) })).toThrow(ShopError)
      expect(priceAndReserve([line], seasonal, new Map(), channel, "c1", { now: new Date(150) }).totalFen).toBe(1500)
    }
  })

  test("released items return to their channel's counter", () => {
    const p1 = product({ variants: [variant({ onlineOrdered: 5, walkIn: 4 })] })
    const item = order().items[0]!
    expect(releaseItems([item], "online", byId(p1))[0]!.variants[0]!.onlineOrdered).toBe(3)
    expect(releaseItems([item], "walkin", byId(p1))[0]!.variants[0]!.walkIn).toBe(2)
    expect(releaseItems([{ ...item, productId: "gone" }], "online", byId(p1))).toEqual([])
  })
})

describe("codes", () => {
  test("order codes carry their campaign's prefix and avoid ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderCode("MR")).toMatch(/^MR-[2-9A-HJKMNP-Z]{4}$/)
    }
  })

  test("typed codes are cleaned, then read against the campaigns' prefixes", () => {
    expect(cleanOrderCode("gc 7k3p")).toBe("GC7K3P")
    expect(cleanOrderCode("GC-7K3")).toBe("GC7K3")
    expect(cleanOrderCode("7K3")).toBeNull()
    expect(cleanOrderCode("ABCD-7K3P")).toBeNull()
    expect(orderCodeCandidates("GC7K3P", ["GC", "MR"])).toEqual(["GC-7K3P"])
    expect(orderCodeCandidates("SZC7K3P", ["GC", "SZC"])).toEqual(["SZC-7K3P"])
    // A bare code could be any campaign's.
    expect(orderCodeCandidates("7K3P", ["GC", "MR"])).toEqual(["GC-7K3P", "MR-7K3P"])
    expect(orderCodeCandidates("XX7K3P", ["GC", "MR"])).toEqual([])
    expect(orderCodeCandidates("GC7K3", ["GC"])).toEqual([])
  })

  test("tokens are long and URL-safe", () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(generateToken()).not.toBe(token)
  })
})

describe("deadlines", () => {
  test("only unpaid orders past their deadline are overdue", () => {
    const now = new Date(1000)
    expect(isPastDeadline({ status: "pending_payment", expiresAt: new Date(999) }, now)).toBe(true)
    expect(isPastDeadline({ status: "pending_payment", expiresAt: new Date(1001) }, now)).toBe(false)
    expect(isPastDeadline({ status: "awaiting_verification", expiresAt: new Date(0) }, now)).toBe(false)
  })

  test("online order window", () => {
    const campaign = {
      status: "open",
      onlineOpensAt: new Date(100),
      onlineClosesAt: new Date(200),
      offers: { delivery: true, pickup: true, booth: true },
    } as Campaign
    expect(onlineWindowState(campaign, new Date(99))).toBe("not_open")
    expect(onlineWindowState(campaign, new Date(100))).toBe("open")
    expect(onlineWindowState(campaign, new Date(200))).toBe("closed")
    // The status wins over the dates.
    expect(onlineWindowState({ ...campaign, status: "draft" }, new Date(150))).toBe("not_open")
    expect(onlineWindowState({ ...campaign, status: "closed" }, new Date(150))).toBe("closed")
  })
})

describe("spam limits", () => {
  test("count live unpaid orders of this campaign only", () => {
    const now = new Date("2027-03-05T12:00:00+08:00")
    const soon = new Date(now.getTime() + 60_000)
    const orders = [
      order({ id: "a", status: "pending_payment", expiresAt: soon }),
      order({ id: "b", status: "pending_payment", expiresAt: new Date(now.getTime() - 1) }),
      order({ id: "c", status: "awaiting_verification" }),
      order({ id: "d", status: "pending_payment", expiresAt: soon, campaignId: "other" }),
    ]
    expect(countUnpaid(orders, "c1", now)).toBe(1)
  })
})

describe("buyer page", () => {
  test("the version changes with status, pickup and proof verdicts", () => {
    const base = order({ status: "awaiting_verification", payment: { submittedAt: new Date(1) } })
    const v = orderVersion(base)
    expect(orderVersion({ ...base })).toBe(v)
    expect(orderVersion({ ...base, status: "paid" })).not.toBe(v)
    expect(orderVersion({ ...base, payment: { ...base.payment, verifiedAt: new Date(2) } })).not.toBe(v)
    expect(orderVersion({ ...base, rejections: [{ reason: "x", at: new Date(2), by: "a" }] })).not.toBe(v)
    const paid = order()
    const partly = { ...paid, items: paid.items.map((item, i) => ({ ...item, pickedUp: i === 0 })) }
    expect(orderVersion(partly)).not.toBe(orderVersion(paid))
  })

  test("the last rejection shows only while the buyer still has to pay", () => {
    const rejections = [
      { reason: "Buram", at: new Date(1), by: "a" },
      { reason: "Nominal kurang", at: new Date(2), by: "a" },
    ]
    expect(openRejection(order({ status: "pending_payment", rejections }))!.reason).toBe("Nominal kurang")
    expect(openRejection(order({ status: "paid", rejections }))).toBeUndefined()
  })
})

describe("scanning", () => {
  const token = generateToken()

  test("reads the order link from the QR, whatever the host", () => {
    expect(parseScan(`https://shop.ppitshenzhen.org/orders/${token}`)).toEqual({ token })
    expect(parseScan(`http://192.168.1.5:3001/orders/${token}?new=1`)).toEqual({ token })
    expect(parseScan(` ${token} `)).toEqual({ token })
  })

  test("reads typed codes", () => {
    expect(parseScan("gc-7k3p")).toEqual({ code: "GC7K3P" })
    expect(parseScan("7K3P")).toEqual({ code: "7K3P" })
  })

  test("ignores other QR codes", () => {
    expect(parseScan("https://u.wechat.com/abcd")).toBeNull()
    expect(parseScan("https://example.com/orders/too-short")).toBeNull()
    expect(parseScan("WIFI:S:booth;T:WPA;P:secret;;")).toBeNull()
    expect(parseScan("")).toBeNull()
  })
})
