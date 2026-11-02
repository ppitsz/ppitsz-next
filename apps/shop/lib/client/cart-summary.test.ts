import { describe, expect, test } from "bun:test"

import type { CatalogBundle, CatalogProduct } from "../catalog"
import { cartSummary, fitsOneMore } from "./cart-summary"

const sizes = [
  { id: "m", label: "M", priceFen: 8000, available: 3, remaining: 5 },
  { id: "l", label: "L", priceFen: 8000, available: 0, remaining: 2 },
]
const shirt: CatalogProduct = {
  id: "kaos",
  name: "Kaos",
  description: "",
  category: "merch",
  tags: [],
  allergens: [],
  variants: sizes,
}
const sticker = { id: "default", label: "", priceFen: 1000, available: 10, remaining: 10 }
const paket: CatalogBundle = {
  id: "paket",
  name: "Paket Merch",
  description: "",
  priceFen: 8500,
  components: [
    { productId: "kaos", name: "Kaos", qty: 1, variants: sizes },
    { productId: "stiker", name: "Stiker", qty: 2, variants: [sticker] },
  ],
}
const catalog = { products: [shirt], bundles: [paket] }

describe("cart summary", () => {
  test("prices bundles and names what they hold", () => {
    const summary = cartSummary([{ bundleId: "paket", picks: ["m", "default"], qty: 2 }], catalog)
    expect(summary.totalFen).toBe(17000)
    expect(summary.lines[0]).toMatchObject({ name: "Paket Merch", detail: "Kaos M + 2× Stiker", available: 3, short: false })
  })

  test("a bundle and the same shirt on its own share one stock", () => {
    const summary = cartSummary(
      [
        { productId: "kaos", variantId: "m", qty: 2 },
        { bundleId: "paket", picks: ["m", "default"], qty: 2 },
      ],
      catalog
    )
    expect(summary.lines.map((l) => l.short)).toEqual([true, true])
    expect(summary.demand.get("kaos/m")).toBe(4)
  })

  test("the kasir counts what is left after online orders", () => {
    const lines = [{ bundleId: "paket", picks: ["l", "default"], qty: 1 }]
    expect(cartSummary(lines, catalog).lines[0]!.short).toBe(true)
    const kasir = cartSummary(lines, catalog, "remaining")
    expect(kasir.lines[0]!.short).toBe(false)
    expect(fitsOneMore(kasir.lines[0]!, kasir.demand, "remaining")).toBe(true)
  })

  test("drops lines whose bundle or picks no longer exist", () => {
    const summary = cartSummary(
      [
        { bundleId: "gone", picks: ["m", "default"], qty: 1 },
        { bundleId: "paket", picks: ["xl", "default"], qty: 1 },
        { bundleId: "paket", picks: ["m"], qty: 1 },
      ],
      catalog
    )
    expect(summary.lines).toEqual([])
  })
})
