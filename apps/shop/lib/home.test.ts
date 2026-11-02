import { describe, expect, test } from "bun:test"

import { toCatalog } from "./catalog"
import { bundle, campaign, product, variant } from "./domain/fixtures"
import { badgeOf, daysUntil, featuredOf, showcaseFilters, showcaseOf } from "./home"

const NOW = new Date("2027-03-05T12:00:00+08:00")

describe("homepage cards", () => {
  const c = campaign({ offers: { delivery: true, pickup: true, booth: false } })
  const products = [
    product({
      id: "nasi",
      tags: ["Weekly"],
      allergens: ["Coconut"],
      variants: [variant({ id: "v1", stock: 40, onlineOrdered: 37 })],
    }),
    product({
      id: "kaos",
      name: "Kaos",
      category: "merch",
      variants: [variant({ id: "m", priceFen: 8000, stock: 10 }), variant({ id: "l", priceFen: 9000, stock: 10 })],
    }),
    product({ id: "lama", onSaleUntil: new Date(NOW.getTime() - 1) }),
    product({ id: "baru", onSaleFrom: new Date(NOW.getTime() + 86_400_000) }),
  ]
  const bundles = [bundle({ id: "paket", components: [{ productId: "kaos", qty: 1 }] })]
  const catalog = toCatalog(c, products, bundles, { now: NOW })
  const items = showcaseOf(catalog, products)

  test("bundles first, then what the catalog shows, linked to their rows", () => {
    expect(items.map((i) => i.key)).toEqual(["bundle-paket", "product-nasi", "product-kaos", "product-baru"])
    expect(items[1]!.href).toBe(`/${c.slug}#product-nasi`)
  })

  test("stock left out of the starting stock, the lowest price, and a badge", () => {
    expect(items[1]).toMatchObject({
      stock: { left: 3, total: 40 },
      badge: "low",
      priceFrom: false,
      tags: ["Weekly"],
      allergens: ["Coconut"],
    })
    expect(items[2]).toMatchObject({ priceFen: 8000, priceFrom: true, badge: null })
    expect(items[3]!.badge).toBe("soon")
    expect(items[0]!.badge).toBe("bundle")
  })

  test("badges, most important first", () => {
    expect(badgeOf({ upcoming: true, left: 0, remaining: 0 })).toBe("soon")
    expect(badgeOf({ upcoming: false, left: 0, remaining: 0 })).toBe("sold_out")
    expect(badgeOf({ upcoming: false, left: 0, remaining: 4 })).toBe("booth_only")
    expect(badgeOf({ upcoming: false, left: 6, remaining: 6 })).toBeNull()
  })

  test("chips for the categories present, and Bundles", () => {
    expect(showcaseFilters(items).map((f) => f.id)).toEqual(["food", "merch", "bundle"])
    expect(showcaseFilters(items.filter((i) => i.kind === "product")).map((f) => f.id)).toEqual(["food", "merch"])
  })

  test("the featured product, with the bundles that hold it; none when it isn't shown", () => {
    expect(featuredOf({ ...c, featuredProductId: "kaos" }, catalog, items, bundles)).toMatchObject({
      item: { key: "product-kaos" },
      inBundles: [{ name: bundles[0]!.name, href: `/${c.slug}#bundle-paket` }],
    })
    expect(featuredOf({ ...c, featuredProductId: "lama" }, catalog, items, bundles)).toBeNull()
    expect(featuredOf(c, catalog, items, bundles)).toBeNull()
  })

  test("days left, rounded up", () => {
    expect(daysUntil(new Date(NOW.getTime() + 1), NOW)).toBe(1)
    expect(daysUntil(new Date(NOW.getTime() + 2 * 86_400_000), NOW)).toBe(2)
    expect(daysUntil(NOW, NOW)).toBeNull()
    expect(daysUntil(null, NOW)).toBeNull()
  })
})
