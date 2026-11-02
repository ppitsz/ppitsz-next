import { CATEGORY_LABELS, type Catalog } from "./catalog"
import { contentsLabel } from "./domain/bundle"
import type { Bundle, Campaign, Category, Product } from "./domain/types"

/*
 * What the shop's homepage shows: cards for what open campaigns sell, and
 * the featured product of the hero. Built from each campaign's catalog, so
 * the homepage never shows what the catalog wouldn't (ended sale dates,
 * inactive products, stock kept for the booth).
 */

/** Almost gone at this many orderable units or fewer. */
export const LOW_STOCK = 5

export type ShowcaseBadge = "soon" | "low" | "sold_out" | "booth_only" | "bundle"

export const SHOWCASE_BADGES: Record<ShowcaseBadge, string> = {
  soon: "Coming soon",
  low: "Almost gone",
  sold_out: "Sold out",
  booth_only: "Booth only",
  bundle: "Bundle",
}

export interface ShowcaseItem {
  /** Unique across campaigns: "product-{id}" or "bundle-{id}", also the catalog anchor. */
  key: string
  kind: "product" | "bundle"
  /** Null for bundles, which the chips list as Bundles. */
  category: Category | null
  name: string
  /** A product's description, or what a bundle holds. */
  detail: string
  campaignName: string
  /** The product's row on its campaign's catalog. */
  href: string
  imageUrl?: string
  /** The lowest price; `priceFrom` when variants differ. */
  priceFen: number
  priceFrom: boolean
  badge: ShowcaseBadge | null
  /** The product's own labels ("New", "Spicy"); none for bundles. */
  tags: string[]
  allergens: string[]
  /** Products only: orderable online now, and the units it started with, for the stock bar. */
  stock?: { left: number; total: number }
  /** ISO date its sale starts, while upcoming. */
  startsAt?: string
}

/**
 * Cards for one campaign: its bundles, then its products. `products` are
 * the raw ones, for each variant's starting stock; `catalog` decides what
 * is shown and how much is left.
 */
export function showcaseOf(catalog: Catalog, products: Product[]): ShowcaseItem[] {
  const raw = new Map(products.map((p) => [p.id, p]))
  const base = `/${catalog.slug}`

  const bundles: ShowcaseItem[] = catalog.bundles.map((b) => ({
    key: `bundle-${b.id}`,
    kind: "bundle",
    category: null,
    name: b.name,
    detail: contentsLabel(b.components.map((c) => ({ name: c.name, variantLabel: "", qty: c.qty }))),
    campaignName: catalog.campaignName,
    href: `${base}#bundle-${b.id}`,
    imageUrl: b.imageUrl,
    priceFen: b.priceFen,
    priceFrom: false,
    badge: "bundle",
    tags: [],
    allergens: [],
  }))

  const items: ShowcaseItem[] = catalog.products.map((p) => {
    const left = p.variants.reduce((sum, v) => sum + v.available, 0)
    const remaining = p.variants.reduce((sum, v) => sum + v.remaining, 0)
    const total = raw.get(p.id)?.variants.reduce((sum, v) => sum + v.stock, 0) ?? remaining
    const prices = p.variants.map((v) => v.priceFen)
    return {
      key: `product-${p.id}`,
      kind: "product",
      category: p.category,
      name: p.name,
      detail: p.description,
      campaignName: catalog.campaignName,
      href: `${base}#product-${p.id}`,
      imageUrl: p.imageUrl,
      priceFen: Math.min(...prices),
      priceFrom: new Set(prices).size > 1,
      badge: badgeOf({ upcoming: !!p.onSaleFrom, left, remaining }),
      tags: p.tags,
      allergens: p.allergens,
      stock: { left, total },
      startsAt: p.onSaleFrom,
    }
  })

  return [...bundles, ...items]
}

/** The one thing a card says about availability, most important first. */
export function badgeOf({ upcoming, left, remaining }: { upcoming: boolean; left: number; remaining: number }) {
  if (upcoming) return "soon"
  if (remaining === 0) return "sold_out"
  if (left === 0) return "booth_only"
  if (left <= LOW_STOCK) return "low"
  return null
}

/** The chips above the cards: "All", each category present, and Bundles when there are bundles. */
export function showcaseFilters(items: ShowcaseItem[]): { id: Category | "bundle"; label: string }[] {
  const categories = (Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => items.some((i) => i.category === c))
  return [
    ...categories.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
    ...(items.some((i) => i.kind === "bundle") ? [{ id: "bundle" as const, label: "Bundles" }] : []),
  ]
}

export interface Featured {
  item: ShowcaseItem
  /** Bundles that hold it, as links to them. */
  inBundles: { name: string; href: string }[]
}

/**
 * The hero's product: the one Danus picked, while the catalog still shows
 * it. Null otherwise, and the hero shows the cover photo instead.
 */
export function featuredOf(campaign: Campaign, catalog: Catalog, items: ShowcaseItem[], bundles: Bundle[]): Featured | null {
  const id = campaign.featuredProductId
  const item = id ? items.find((i) => i.key === `product-${id}`) : undefined
  if (!item) return null
  const shown = new Set(catalog.bundles.map((b) => b.id))
  return {
    item,
    inBundles: bundles
      .filter((b) => shown.has(b.id) && b.components.some((c) => c.productId === id))
      .map((b) => ({ name: b.name, href: `/${catalog.slug}#bundle-${b.id}` })),
  }
}

/** Whole days until `date`, rounded up; null when it has passed. */
export function daysUntil(date: Date | null, now: Date) {
  if (!date || date <= now) return null
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
}
