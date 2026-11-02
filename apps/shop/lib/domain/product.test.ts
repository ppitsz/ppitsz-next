import { describe, expect, test } from "bun:test"

import { ShopError } from "./errors"
import { product, variant } from "./fixtures"
import {
  applyProductEdit,
  checkProductEdit,
  cleanList,
  isOnSale,
  isUnsold,
  mergePaymentAccounts,
  saleWindow,
  splitList,
  type ProductEdit,
  type VariantEdit,
} from "./product"

/* The rules behind product management and campaign settings. */

const v = (overrides: Partial<VariantEdit> = {}): VariantEdit => ({
  id: "v1",
  label: "",
  priceFen: 1500,
  stock: 10,
  onlineCap: 6,
  ...overrides,
})
const edit = (overrides: Partial<ProductEdit> = {}): ProductEdit => ({
  name: "Kaos",
  description: "",
  category: "merch",
  active: true,
  sortOrder: 1,
  variants: [v()],
  ...overrides,
})
const base = { id: "p1", campaignId: "c1" }

describe("checking an edit", () => {
  test("names the field and variant of each problem, for the form", () => {
    const stored = [variant({ id: "s", label: "S", walkIn: 3 }), variant({ id: "m", label: "M" })]
    const issues = checkProductEdit(
      stored,
      edit({ name: "K", variants: [v({ id: "s", label: "S", stock: 2 }), v({ id: undefined, label: "", priceFen: 0 })] })
    )
    expect(issues.map((i) => [i.code, i.field, i.index])).toEqual([
      ["INVALID_PRODUCT", "name", undefined],
      ["STOCK_BELOW_SOLD", "stock", 0],
      ["INVALID_PRODUCT", "label", 1],
      ["INVALID_PRODUCT", "priceFen", 1],
    ])
    expect(issues[1]!.message).toContain("3 are already ordered and sold")
  })

  test("a valid edit has no problems", () => {
    expect(checkProductEdit([variant()], edit())).toEqual([])
  })
})

describe("applying an edit", () => {
  test("keeps the stock counters that orders changed", () => {
    const current = product({ variants: [variant({ onlineOrdered: 4, walkIn: 2 })] })
    const saved = applyProductEdit(current, edit({ variants: [v({ priceFen: 2000, stock: 8, onlineCap: null })] }), base)
    expect(saved.variants[0]).toEqual({
      id: "v1",
      label: "",
      priceFen: 2000,
      stock: 8,
      onlineCap: null,
      onlineOrdered: 4,
      walkIn: 2,
    })
  })

  test("stock can't drop below what is already taken", () => {
    const current = product({ variants: [variant({ onlineOrdered: 4, walkIn: 2 })] })
    expect(() => applyProductEdit(current, edit({ variants: [v({ stock: 5 })] }), base)).toThrow(
      "6 are already ordered and sold"
    )
  })

  test("sold variants can't be removed, unsold ones can", () => {
    const current = product({
      variants: [variant({ id: "s", label: "S", walkIn: 1 }), variant({ id: "m", label: "M" })],
    })
    expect(() => applyProductEdit(current, edit({ variants: [v({ id: "m", label: "M" })] }), base)).toThrow(
      "can't be deleted"
    )
    const onlyS = applyProductEdit(current, edit({ variants: [v({ id: "s", label: "S" })] }), base)
    expect(onlyS.variants.map((x) => x.id)).toEqual(["s"])
  })

  test("new variants get fresh ids; several variants need distinct names", () => {
    let n = 0
    const saved = applyProductEdit(
      null,
      edit({ variants: [v({ id: undefined, label: "S" }), v({ id: undefined, label: "M" })] }),
      base,
      () => `new${++n}`
    )
    expect(saved.variants.map((x) => x.id)).toEqual(["new1", "new2"])
    expect(saved.variants.every((x) => x.onlineOrdered === 0 && x.walkIn === 0)).toBe(true)
    expect(() => applyProductEdit(null, edit({ variants: [v({ label: "S" }), v({ label: "s " })] }), base)).toThrow(
      "used twice"
    )
    expect(() => applyProductEdit(null, edit({ variants: [v({ label: "S" }), v({ label: "" })] }), base)).toThrow(
      "needs a name"
    )
  })

  test("a client can't claim another product's variant id to inherit counters", () => {
    const saved = applyProductEdit(null, edit({ variants: [v({ id: "made-up" })] }), base, () => "fresh")
    expect(saved.variants[0]!.id).toBe("fresh")
  })

  test("rejects bad numbers and names", () => {
    const bad = (overrides: Partial<VariantEdit>) => edit({ variants: [v(overrides)] })
    for (const input of [
      bad({ priceFen: 0 }),
      bad({ priceFen: 12.5 }),
      bad({ stock: -1 }),
      bad({ onlineCap: -1 }),
      bad({ label: "x".repeat(41) }),
      edit({ name: " " }),
      edit({ name: "x".repeat(81) }),
      edit({ sortOrder: 1000 }),
      edit({ variants: [] }),
    ]) {
      expect(() => applyProductEdit(null, input, base)).toThrow(ShopError)
    }
  })

  test("only never-sold products count as unsold", () => {
    expect(isUnsold(product())).toBe(true)
    expect(isUnsold(product({ variants: [variant({ onlineOrdered: 1 })] }))).toBe(false)
  })
})

describe("campaign settings", () => {
  test("payment accounts keep, replace or drop their QR", () => {
    const current = [
      { id: "a", method: "wechat" as const, holder: "A", detail: "a", qrImagePath: "payment-accounts/a.jpg" },
      { id: "b", method: "alipay" as const, holder: "B", detail: "b", qrImagePath: "payment-accounts/b.jpg" },
    ]
    const merged = mergePaymentAccounts(current, [
      { id: "a", method: "wechat", holder: "A2", detail: "a" },
      { id: "b", method: "alipay", holder: "B", detail: "b", removeQr: true },
      { id: "c", method: "bank", holder: "C", detail: "c", newQrPath: "payment-accounts/c.jpg" },
    ])
    expect(merged.map((a) => a.qrImagePath)).toEqual(["payment-accounts/a.jpg", undefined, "payment-accounts/c.jpg"])
    expect(merged[0]!.holder).toBe("A2")
  })
})

describe("size charts", () => {
  const chart = { measures: [" Lebar dada ", "Panjang badan"], note: " Diukur rata. " }
  let next = 0
  const newId = () => `new-${next++}`
  const sized = (overrides: Partial<ProductEdit> = {}) =>
    edit({
      sizeChart: chart,
      variants: [
        v({ id: "m", label: "M", measurements: ["51", " 71 "] }),
        v({ id: undefined, label: "L", measurements: ["54", ""] }),
      ],
      ...overrides,
    })

  test("each variant keeps its own row, trimmed, under the product's columns", () => {
    const saved = applyProductEdit(null, sized(), base, newId)
    expect(saved.sizeChart).toEqual({ measures: ["Lebar dada", "Panjang badan"], note: "Diukur rata." })
    expect(saved.variants.map((x) => x.measurements)).toEqual([["51", "71"], ["54", ""]])
  })

  test("no columns means no table, and the rows go with it", () => {
    const saved = applyProductEdit(null, sized({ sizeChart: { measures: [], note: "x" } }), base, newId)
    expect(saved.sizeChart).toBeUndefined()
    expect(saved.variants.every((x) => x.measurements === undefined)).toBe(true)
    expect(applyProductEdit(null, edit(), base).sizeChart).toBeUndefined()
  })

  test("columns need distinct names, and every row a value per column", () => {
    const issues = (e: ProductEdit) => checkProductEdit([], e).map((i) => [i.field, i.index])
    expect(issues(sized({ sizeChart: { measures: ["Lebar", "lebar "], note: "" } }))).toEqual([["sizeChart", undefined]])
    expect(issues(sized({ sizeChart: { measures: ["", "Panjang"], note: "" } }))).toEqual([["sizeChart", undefined]])
    expect(issues(sized({ sizeChart: { ...chart, measures: Array(7).fill("x").map((x, i) => x + i) } }))).toContainEqual([
      "sizeChart",
      undefined,
    ])
    expect(issues(sized({ variants: [v({ id: "m", label: "M", measurements: ["51"] })] }))).toEqual([["measurements", 0]])
    expect(
      issues(sized({ variants: [v({ id: "m", label: "M", measurements: ["51", "1234567890123"] })] }))
    ).toEqual([["measurements", 0]])
  })
})

describe("sale dates", () => {
  const from = new Date("2027-03-01T00:00:00+08:00")
  const until = new Date("2027-03-15T00:00:00+08:00")

  test("optional on either side, and the end comes after the start", () => {
    expect(checkProductEdit([], edit({ onSaleFrom: from, onSaleUntil: until }))).toEqual([])
    expect(checkProductEdit([], edit({ onSaleFrom: null, onSaleUntil: until }))).toEqual([])
    expect(checkProductEdit([], edit({ onSaleFrom: until, onSaleUntil: from })).map((i) => i.field)).toEqual(["onSale"])
  })

  test("stored with the product; cleared dates are dropped", () => {
    const saved = applyProductEdit(null, edit({ onSaleFrom: from, onSaleUntil: null }), base)
    expect(saved.onSaleFrom).toEqual(from)
    expect(saved.onSaleUntil).toBeUndefined()
  })

  test("upcoming before the start, over from the end, and on sale only when For sale too", () => {
    const seasonal = product({ onSaleFrom: from, onSaleUntil: until })
    expect(saleWindow(seasonal, new Date(from.getTime() - 1))).toBe("upcoming")
    expect(saleWindow(seasonal, from)).toBe("on")
    expect(saleWindow(seasonal, until)).toBe("ended")
    expect(saleWindow(product(), new Date(0))).toBe("on")
    expect(isOnSale(seasonal, from)).toBe(true)
    expect(isOnSale({ ...seasonal, active: false }, from)).toBe(false)
  })
})

describe("labels and allergens", () => {
  test("typed with commas; trimmed, without empties or repeats", () => {
    expect(splitList(" New, spicy ,, new ")).toEqual(["New", "spicy"])
    expect(cleanList(undefined)).toEqual([])
  })

  test("at most 3 short labels and 8 allergens", () => {
    expect(checkProductEdit([], edit({ tags: ["New", "Spicy", "Weekly"], allergens: ["Coconut"] }))).toEqual([])
    expect(checkProductEdit([], edit({ tags: ["a", "b", "c", "d"] })).map((i) => i.field)).toEqual(["tags"])
    expect(checkProductEdit([], edit({ tags: ["x".repeat(21)] })).map((i) => i.field)).toEqual(["tags"])
    expect(checkProductEdit([], edit({ allergens: Array.from({ length: 9 }, (_, i) => `a${i}`) })).map((i) => i.field)).toEqual([
      "allergens",
    ])
  })

  test("stored cleaned with the product", () => {
    const saved = applyProductEdit(null, edit({ tags: [" New ", "new"], allergens: ["Coconut", " "] }), base)
    expect([saved.tags, saved.allergens]).toEqual([["New"], ["Coconut"]])
    expect(applyProductEdit(null, edit({}), base)).toMatchObject({ tags: [], allergens: [] })
  })
})
