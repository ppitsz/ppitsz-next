import { describe, expect, test } from "bun:test"

import { PAYMENT_METHOD_LABELS } from "../catalog"
import { bundle, campaign, merch, order } from "./fixtures"
import { buildRecap, pickupList } from "./recap"
import type { BundleItem, Order, ProductItem } from "./types"

/* The sales recap: one campaign with every kind of order in it. */

const NOW = new Date("2027-03-17T12:00:00+08:00")
const { shirt, sticker } = merch()

const shirtItem = (variantId: "m" | "l", qty: number, pickedUp = false): ProductItem => ({
  productId: "kaos",
  variantId,
  name: "Kaos",
  variantLabel: variantId.toUpperCase(),
  priceFen: 8000,
  qty,
  pickedUp,
})
const stickerItem = (qty: number, pickedUp = false): ProductItem => ({
  productId: "stiker",
  variantId: "default",
  name: "Stiker",
  variantLabel: "",
  priceFen: 1000,
  qty,
  pickedUp,
})
const bundleItem = (pickedUp = false): BundleItem => ({
  bundleId: "paket",
  name: "Paket Merch",
  variantLabel: "Kaos M + 2× Stiker",
  priceFen: 8500,
  qty: 1,
  pickedUp,
  contents: [
    { productId: "kaos", variantId: "m", name: "Kaos", variantLabel: "M", qty: 1 },
    { productId: "stiker", variantId: "default", name: "Stiker", variantLabel: "", qty: 2 },
  ],
})
const total = (o: Partial<Order>) => (o.items ?? []).reduce((sum, i) => sum + i.priceFen * i.qty, 0)
const make = (id: string, overrides: Partial<Order>) => order({ id, code: `GC-${id}`, totalFen: total(overrides), ...overrides })
const paidBy = (method: "wechat" | "alipay" | "cash", accountId?: string) => ({
  method,
  accountId,
  verifiedAt: NOW,
  verifiedBy: "admin-1",
})

const orders: Order[] = [
  // Paid online order: a bundle still to collect, a sticker already handed over.
  make("A", {
    buyer: { uid: "u-budi", email: "budi@test.test", name: "Budi", wechatId: "budi", phone: "" },
    status: "paid",
    items: [bundleItem(), stickerItem(1, true)],
    payment: paidBy("wechat", "wx"),
  }),
  make("B", { channel: "walkin", buyer: null, status: "picked_up", items: [shirtItem("l", 2, true)], payment: paidBy("cash") }),
  make("C", { status: "awaiting_verification", items: [shirtItem("m", 1)], payment: { method: "wechat", submittedAt: NOW } }),
  // Paid, canceled, money sent back.
  make("D", {
    status: "cancelled",
    items: [shirtItem("l", 1)],
    payment: paidBy("alipay", "ali"),
    refund: { amountFen: 8000, method: "alipay", note: "", at: NOW, by: "admin-1" },
  }),
  // Paid, canceled, money not sent back yet.
  make("E", { status: "cancelled", items: [stickerItem(1)], payment: paidBy("wechat", "wx") }),
  // A register mistake, undone: counts for nothing.
  make("F", { channel: "walkin", buyer: null, status: "cancelled", items: [stickerItem(1, true)], payment: paidBy("cash") }),
  make("G", { status: "pending_payment", items: [stickerItem(1)], expiresAt: NOW }),
  make("H", { status: "expired", items: [stickerItem(3)] }),
  make("I", {
    buyer: { uid: "u-anita", email: "anita@test.test", name: "anita", wechatId: "anita", phone: "" },
    status: "paid",
    items: [shirtItem("m", 1, true), stickerItem(2)],
    payment: paidBy("wechat", "wx"),
  }),
]

const recap = buildRecap(campaign(), orders, [sticker, shirt], [bundle()], PAYMENT_METHOD_LABELS)

describe("money", () => {
  test("sales are paid online orders and walk-ins; held is what came in minus what went back", () => {
    expect(recap.money).toEqual({
      salesFen: 9500 + 16000 + 10000,
      salesByChannel: { online: 9500 + 10000, walkin: 16000 },
      deliveryFeesFen: 0,
      receivedFen: 35500 + 8000 + 1000,
      refundedFen: 8000,
      heldFen: 35500 + 1000,
      owedFen: 1000,
      owedOrders: 1,
      awaitingFen: 8000,
      awaitingOrders: 1,
      unpaidFen: 1000,
      unpaidOrders: 1,
    })
  })

  test("per account, to check against each statement, with refunds per method", () => {
    expect(recap.accounts.map((a) => [a.label, a.orders, a.receivedFen])).toEqual([
      ["WeChat Pay · Nadia", 3, 9500 + 1000 + 10000],
      ["Cash", 1, 16000],
      ["Alipay · Nadia", 1, 8000],
    ])
    expect(recap.refundsByMethod).toEqual([{ method: "alipay", fen: 8000, orders: 1 }])
  })
})

describe("what was sold", () => {
  test("bundles first, then variants in catalog order, each with its revenue per channel", () => {
    expect(recap.lines.map((l) => [l.key, l.qty.online, l.qty.walkin, l.fen])).toEqual([
      ["b:paket", 1, 0, 8500],
      ["p:kaos/m", 1, 0, 8000],
      ["p:kaos/l", 0, 2, 16000],
      ["p:stiker/default", 3, 0, 3000],
    ])
  })

  test("units count what bundles took, what was handed over and what unpaid orders hold", () => {
    const units = Object.fromEntries(recap.units.map((u) => [u.key, u]))
    expect(units["kaos/m"]).toMatchObject({ sold: { online: 2, walkin: 0 }, inBundles: 1, handedOver: 1, toCollect: 1, unpaid: 1 })
    expect(units["kaos/l"]).toMatchObject({ sold: { online: 0, walkin: 2 }, inBundles: 0, handedOver: 2, toCollect: 0 })
    expect(units["stiker/default"]).toMatchObject({
      sold: { online: 5, walkin: 0 },
      inBundles: 2,
      handedOver: 1,
      toCollect: 4,
      unpaid: 1,
      stock: 10,
      left: 10,
    })
    expect(recap.units.map((u) => u.key)).toEqual(["kaos/m", "kaos/l", "stiker/default"])
    expect(recap.toCollectOrders).toBe(2)
  })
})

describe("the pickup list", () => {
  test("paid orders with what is left to hand over, by name whatever the case", () => {
    expect(pickupList(orders)).toEqual([
      { orderId: "I", campaignId: "c1", code: "GC-I", name: "anita", wechatId: "anita", items: ["2× Stiker"] },
      { orderId: "A", campaignId: "c1", code: "GC-A", name: "Budi", wechatId: "budi", items: ["1× Paket Merch · Kaos M + 2× Stiker"] },
    ])
  })

  test("a custom nickname is listed next to its item", () => {
    const named = order({
      id: "N",
      code: "GC-N",
      items: [
        { productId: "kaos", variantId: "m", name: "Kaos", variantLabel: "M", priceFen: 8000, qty: 2, pickedUp: false, nicknames: ["Budi", "Ani"] },
      ],
    })
    expect(pickupList([named])[0]!.items).toEqual(["2× Kaos · M – Names: Budi, Ani"])
  })
})
