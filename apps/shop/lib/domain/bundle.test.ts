import { describe, expect, test } from "bun:test"

import { applyBundleEdit, bundlesLeft, checkBundleEdit, contentsLabel, type BundleEdit } from "./bundle"
import { lineKey, parseCart } from "./cart"
import { ShopError, type ErrorCode } from "./errors"
import { bundle, byId, merch, order, product, variant } from "./fixtures"
import { applyCommand } from "./lifecycle"
import { isBundleItem, priceAndReserve, releaseItems, stockUnits } from "./order"
import type { BundleItem, CartLine, Channel, Product } from "./types"

function expectCode(run: () => unknown, code: ErrorCode) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ShopError)
    expect((error as ShopError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}, but nothing was thrown`)
}

function sell(lines: CartLine[], products: Product[], channel: Channel = "online", bundles = [bundle()]) {
  return priceAndReserve(lines, byId(...products), byId(...bundles), channel, "c1")
}

const counters = (products: Product[], id: string) =>
  products.find((p) => p.id === id)!.variants.map((v) => ({ id: v.id, onlineOrdered: v.onlineOrdered, walkIn: v.walkIn }))

describe("bundle cart lines", () => {
  test("merge when the picks are the same, stay apart when they differ", () => {
    const lines = parseCart([
      { bundleId: "paket", picks: ["m", "default"], qty: 1 },
      { bundleId: "paket", picks: ["m", "default"], qty: 2 },
      { bundleId: "paket", picks: ["l", "default"], qty: 1 },
      { productId: "kaos", variantId: "m", qty: 1 },
    ])
    expect(lines).toEqual([
      { bundleId: "paket", picks: ["m", "default"], qty: 3 },
      { bundleId: "paket", picks: ["l", "default"], qty: 1 },
      { productId: "kaos", variantId: "m", qty: 1 },
    ])
    expect(lineKey(lines[0]!)).not.toBe(lineKey(lines[1]!))
  })

  test("refuse picks that aren't a list of ids", () => {
    for (const picks of [undefined, [], "m", [""], [1], Array(9).fill("m")]) {
      expectCode(() => parseCart([{ bundleId: "paket", picks, qty: 1 }]), "INVALID_CART")
    }
  })
})

describe("pricing bundles", () => {
  test("cost the bundle's price and take every component's units", () => {
    const { shirt, sticker } = merch()
    const result = sell([{ bundleId: "paket", picks: ["l", "default"], qty: 2 }], [shirt, sticker])
    expect(result.totalFen).toBe(2 * 8500)
    const item = result.items[0] as BundleItem
    expect(item).toMatchObject({ bundleId: "paket", name: "Paket Merch", priceFen: 8500, qty: 2, pickedUp: false })
    expect(item.variantLabel).toBe("Kaos L + 2× Stiker")
    expect(item.contents).toEqual([
      { productId: "kaos", variantId: "l", name: "Kaos", variantLabel: "L", qty: 1 },
      { productId: "stiker", variantId: "default", name: "Stiker", variantLabel: "", qty: 2 },
    ])
    expect(counters(result.updatedProducts, "kaos")).toEqual([
      { id: "m", onlineOrdered: 0, walkIn: 0 },
      { id: "l", onlineOrdered: 2, walkIn: 0 },
    ])
    expect(counters(result.updatedProducts, "stiker")).toEqual([{ id: "default", onlineOrdered: 4, walkIn: 0 }])
  })

  test("share stock with the same product sold on its own", () => {
    const { shirt, sticker } = merch()
    const lines: CartLine[] = [
      { productId: "kaos", variantId: "m", qty: 3 },
      { bundleId: "paket", picks: ["m", "default"], qty: 2 },
    ]
    expect(sell(lines, [shirt, sticker]).updatedProducts.length).toBe(2)
    expectCode(() => sell([...lines, { productId: "kaos", variantId: "m", qty: 1 }], [shirt, sticker]), "SOLD_OUT")
  })

  test("two components of the same product may pick different variants", () => {
    const { shirt } = merch()
    const couple = bundle({
      components: [
        { productId: "kaos", qty: 1 },
        { productId: "kaos", qty: 1 },
      ],
    })
    const result = sell([{ bundleId: "paket", picks: ["m", "l"], qty: 1 }], [shirt], "walkin", [couple])
    expect(counters(result.updatedProducts, "kaos")).toEqual([
      { id: "m", onlineOrdered: 0, walkIn: 1 },
      { id: "l", onlineOrdered: 0, walkIn: 1 },
    ])
    expect(result.items[0]!.pickedUp).toBe(true)
  })

  test("respect the online cap of each component", () => {
    const { sticker } = merch()
    const shirt = product({ id: "kaos", variants: [variant({ id: "m", stock: 10, onlineCap: 1 })] })
    const line: CartLine = { bundleId: "paket", picks: ["m", "default"], qty: 2 }
    expectCode(() => sell([line], [shirt, sticker]), "SOLD_OUT")
    expect(sell([line], [shirt, sticker], "walkin").totalFen).toBe(2 * 8500)
  })

  test("may hold a product that isn't sold on its own", () => {
    const { shirt, sticker } = merch()
    const hidden = { ...sticker, active: false }
    expect(sell([{ bundleId: "paket", picks: ["m", "default"], qty: 1 }], [shirt, hidden]).totalFen).toBe(8500)
    expectCode(() => sell([{ productId: "stiker", variantId: "default", qty: 1 }], [shirt, hidden]), "PRODUCT_UNAVAILABLE")
  })

  test("refuse inactive, unknown and other campaigns' bundles, and wrong picks", () => {
    const { shirt, sticker } = merch()
    const line: CartLine = { bundleId: "paket", picks: ["m", "default"], qty: 1 }
    expectCode(() => sell([line], [shirt, sticker], "online", [bundle({ active: false })]), "PRODUCT_UNAVAILABLE")
    expectCode(() => sell([line], [shirt, sticker], "online", []), "PRODUCT_UNAVAILABLE")
    expectCode(() => sell([line], [shirt, sticker], "online", [bundle({ campaignId: "other" })]), "PRODUCT_UNAVAILABLE")
    expectCode(() => sell([{ ...line, picks: ["m"] }], [shirt, sticker]), "INVALID_CART")
    expectCode(() => sell([{ ...line, picks: ["xl", "default"] }], [shirt, sticker]), "PRODUCT_UNAVAILABLE")
    expectCode(() => sell([line], [shirt, { ...sticker, campaignId: "other" }]), "PRODUCT_UNAVAILABLE")
  })
})

describe("releasing bundles", () => {
  test("an expired or canceled bundle gives back every unit it took", () => {
    const { shirt, sticker } = merch()
    const sold = sell([{ bundleId: "paket", picks: ["l", "default"], qty: 2 }], [shirt, sticker])
    const placed = order({ items: sold.items, totalFen: sold.totalFen })
    const { released } = applyCommand(placed, { type: "cancel", reason: "Salah input" }, { uid: "a", role: "admin" }, new Date())
    expect(stockUnits(released)).toEqual([
      { productId: "kaos", variantId: "l", qty: 2 },
      { productId: "stiker", variantId: "default", qty: 4 },
    ])
    const back = releaseItems(released, "online", byId(...sold.updatedProducts))
    expect(counters(back, "kaos")).toEqual([
      { id: "m", onlineOrdered: 0, walkIn: 0 },
      { id: "l", onlineOrdered: 0, walkIn: 0 },
    ])
    expect(counters(back, "stiker")).toEqual([{ id: "default", onlineOrdered: 0, walkIn: 0 }])
  })

  test("a bundle is handed over as one item", () => {
    const { shirt, sticker } = merch()
    const sold = sell(
      [
        { bundleId: "paket", picks: ["m", "default"], qty: 1 },
        { productId: "kaos", variantId: "l", qty: 1 },
      ],
      [shirt, sticker]
    )
    const paid = order({ status: "paid", items: sold.items })
    const { order: after, handedOver } = applyCommand(paid, { type: "hand_over", indexes: [0] }, { uid: "b", role: "booth" }, new Date())
    expect(handedOver).toEqual([0])
    expect(after.items.map((i) => [isBundleItem(i), i.pickedUp])).toEqual([
      [true, true],
      [false, false],
    ])
  })
})

describe("bundle availability", () => {
  test("is the scarcest component, and units of the same variant add up", () => {
    expect(bundlesLeft([{ key: "kaos/m", qty: 1, available: 5 }, { key: "stiker", qty: 2, available: 7 }])).toBe(3)
    expect(bundlesLeft([{ key: "kaos/m", qty: 1, available: 5 }, { key: "kaos/m", qty: 1, available: 5 }])).toBe(2)
    expect(bundlesLeft([{ key: "kaos/m", qty: 1, available: -2 }])).toBe(0)
    expect(bundlesLeft([])).toBe(0)
  })

  test("names what a bundle holds", () => {
    expect(
      contentsLabel([
        { name: "Kaos", variantLabel: "M", qty: 2 },
        { name: "Stiker", variantLabel: "", qty: 1 },
      ])
    ).toBe("2× Kaos M + Stiker")
  })
})

describe("bundle edits", () => {
  const ids = new Set(["kaos", "stiker"])
  const edit = (overrides: Partial<BundleEdit> = {}): BundleEdit => ({
    name: "Paket Merch",
    description: "",
    priceFen: 8500,
    active: true,
    sortOrder: 1,
    components: [
      { productId: "kaos", qty: 1 },
      { productId: "stiker", qty: 1 },
    ],
    ...overrides,
  })

  test("a valid edit has no issues and trims its text", () => {
    expect(checkBundleEdit(edit(), ids)).toEqual([])
    const saved = applyBundleEdit(edit({ name: "  Paket  " }), { id: "b1", campaignId: "c1" }, ids)
    expect(saved).toMatchObject({ id: "b1", campaignId: "c1", name: "Paket", priceFen: 8500 })
  })

  test("needs at least two units, of products in the campaign", () => {
    expect(checkBundleEdit(edit({ components: [{ productId: "kaos", qty: 1 }] }), ids).map((i) => i.field)).toEqual([
      "components",
    ])
    expect(checkBundleEdit(edit({ components: [{ productId: "kaos", qty: 2 }] }), ids)).toEqual([])
    const unknown = checkBundleEdit(edit({ components: [{ productId: "nope", qty: 2 }] }), ids)
    expect(unknown).toEqual([{ field: "components", index: 0, message: "Choose the product." }])
    expect(checkBundleEdit(edit({ components: [] }), ids)).toHaveLength(1)
  })

  test("checks price, quantities, name and order", () => {
    const fields = (e: BundleEdit) => checkBundleEdit(e, ids).map((i) => i.field)
    expect(fields(edit({ priceFen: 0 }))).toEqual(["priceFen"])
    expect(fields(edit({ priceFen: 12.5 }))).toEqual(["priceFen"])
    expect(fields(edit({ name: "A" }))).toEqual(["name"])
    expect(fields(edit({ sortOrder: -1 }))).toEqual(["sortOrder"])
    expect(fields(edit({ components: [{ productId: "kaos", qty: 11 }] }))).toEqual(["components"])
  })

  test("applying a bad edit names the component", () => {
    try {
      applyBundleEdit(edit({ components: [{ productId: "kaos", qty: 1 }, { productId: "nope", qty: 1 }] }), { id: "b", campaignId: "c1" }, ids)
      throw new Error("Expected INVALID_BUNDLE")
    } catch (error) {
      expect((error as ShopError).code).toBe("INVALID_BUNDLE")
      expect((error as ShopError).message).toContain("Product 2")
    }
  })
})
