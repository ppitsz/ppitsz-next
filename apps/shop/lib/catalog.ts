import { slotState, type SlotState } from "./domain/delivery"
import { onlineWindowState } from "./domain/order"
import { saleWindow } from "./domain/product"
import { availability } from "./domain/stock"
import type { Bundle, Campaign, CampaignOffers, Category, PaymentMethod, Product, Variant } from "./domain/types"

/*
 * What the buyer's pages send to the browser: no stock counters or caps,
 * only what a buyer needs to choose.
 */

export interface CatalogVariant {
  id: string
  label: string
  priceFen: number
  /** Units an online order can still take. */
  available: number
  /** Units left at all; > 0 with available 0 means "only at the booth". */
  remaining: number
}

export interface CatalogProduct {
  id: string
  name: string
  description: string
  category: Category
  imageUrl?: string
  sizeChart?: CatalogSizeChart
  /** Short labels: "New", "Spicy". */
  tags: string[]
  allergens: string[]
  /** ISO date, set while the product isn't on sale yet: shown, not orderable. */
  onSaleFrom?: string
  /** ISO date its sale ends, if it has one. Past it, the product leaves the catalog. */
  onSaleUntil?: string
  variants: CatalogVariant[]
}

/** A product's size chart: the measurement table, the image, or both. */
export interface CatalogSizeChart {
  /** Column names, in cm. */
  measures: string[]
  /** One row per variant, in the product's order. */
  rows: { label: string; values: string[] }[]
  note: string
  imageUrl?: string
}

/** One product inside a bundle, with the variants a buyer can pick from. */
export interface CatalogComponent {
  productId: string
  name: string
  /** Units of the picked variant in one bundle. */
  qty: number
  sizeChart?: CatalogSizeChart
  variants: CatalogVariant[]
}

export interface CatalogBundle {
  id: string
  name: string
  description: string
  imageUrl?: string
  priceFen: number
  components: CatalogComponent[]
}

/** A delivery slot as checkout shows it. */
export interface CatalogSlot {
  id: string
  /** ISO dates, for the client. */
  startsAt: string
  endsAt: string
  state: SlotState
}

export interface Catalog {
  campaignId: string
  campaignName: string
  /** The campaign's URL name: its catalog is /[slug], its checkout /[slug]/checkout. */
  slug: string
  tagline: string
  coverImageUrl?: string
  pickupInfo: string
  /** ISO dates, for the client; null for no limit. */
  onlineOpensAt: string | null
  onlineClosesAt: string | null
  window: "not_open" | "open" | "closed"
  offers: CampaignOffers
  deliveryFeeFen: number
  deliverySlots: CatalogSlot[]
  paymentWindowMinutes: number
  /** Products sold on their own. */
  products: CatalogProduct[]
  bundles: CatalogBundle[]
}

export function mediaUrl(path: string) {
  return `/media/${path.split("/").map(encodeURIComponent).join("/")}`
}

/**
 * `products` must include the inactive ones, since a bundle may contain a
 * product that is not sold on its own. Bundles with a missing product are
 * left out. Products whose sale dates are over are left out too; upcoming
 * ones are listed with their start, for buyers to see what is coming. `slotPlaces` is how many orders each delivery slot holds
 * (store.slotPlaces); without it every slot counts as empty.
 */
export function toCatalog(
  campaign: Campaign,
  products: Product[],
  bundles: Bundle[],
  { now = new Date(), slotPlaces = new Map<string, number>() } = {}
): Catalog {
  const byId = new Map(products.map((p) => [p.id, p]))
  // Without a booth there are no walk-ins to keep stock for.
  const toCatalogVariant = (v: Variant): CatalogVariant => {
    const a = availability(v, campaign.offers.booth)
    return { id: v.id, label: v.label, priceFen: v.priceFen, available: a.onlineRemaining, remaining: a.remaining }
  }
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    slug: campaign.slug,
    tagline: campaign.tagline,
    coverImageUrl: campaign.coverImagePath ? mediaUrl(campaign.coverImagePath) : undefined,
    pickupInfo: campaign.pickupInfo,
    onlineOpensAt: campaign.onlineOpensAt?.toISOString() ?? null,
    onlineClosesAt: campaign.onlineClosesAt?.toISOString() ?? null,
    window: onlineWindowState(campaign, now),
    offers: campaign.offers,
    deliveryFeeFen: campaign.deliveryFeeFen,
    deliverySlots: campaign.offers.delivery
      ? campaign.deliverySlots.map((s) => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          state: slotState(s, slotPlaces.get(s.id) ?? 0, now),
        }))
      : [],
    paymentWindowMinutes: campaign.paymentWindowMinutes,
    products: products
      .filter((p) => p.active && saleWindow(p, now) !== "ended")
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        imageUrl: p.imagePath ? mediaUrl(p.imagePath) : undefined,
        sizeChart: sizeChartOf(p),
        tags: p.tags,
        allergens: p.allergens,
        onSaleFrom: saleWindow(p, now) === "upcoming" ? p.onSaleFrom!.toISOString() : undefined,
        onSaleUntil: p.onSaleUntil?.toISOString(),
        variants: p.variants.map(toCatalogVariant),
      })),
    bundles: bundles.flatMap((b) => {
      const components = b.components.map((c) => ({ component: c, product: byId.get(c.productId) }))
      if (!b.active || components.some(({ product }) => !product)) return []
      return [
        {
          id: b.id,
          name: b.name,
          description: b.description,
          imageUrl: b.imagePath ? mediaUrl(b.imagePath) : undefined,
          priceFen: b.priceFen,
          components: components.map(({ component, product }) => ({
            productId: product!.id,
            name: product!.name,
            qty: component.qty,
            sizeChart: sizeChartOf(product!),
            variants: product!.variants.map(toCatalogVariant),
          })),
        },
      ]
    }),
  }
}

/** The size chart buyers can open, or undefined when the product has none. */
export function sizeChartOf(product: Product): CatalogSizeChart | undefined {
  const measures = product.sizeChart?.measures ?? []
  const imageUrl = product.sizeChartPath ? mediaUrl(product.sizeChartPath) : undefined
  if (measures.length === 0 && !imageUrl) return undefined
  return {
    measures,
    rows: measures.length
      ? product.variants.map((v) => ({ label: v.label, values: measures.map((_, i) => v.measurements?.[i] ?? "") }))
      : [],
    note: product.sizeChart?.note ?? "",
    imageUrl,
  }
}

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food and drinks",
  merch: "Merchandise",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wechat: "WeChat Pay",
  alipay: "Alipay",
  bank: "Bank transfer",
  cash: "Cash",
}
