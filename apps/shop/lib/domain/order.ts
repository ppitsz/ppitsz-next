import { contentsLabel } from "./bundle"
import { isBundleLine, parseCart } from "./cart"
import { ShopError } from "./errors"
import { isOnSale } from "./product"
import { release, reserve } from "./stock"
import type {
  Bundle,
  BundleItem,
  BundleUnit,
  Campaign,
  CartLine,
  Channel,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Variant,
} from "./types"

/* -------------------------------------------------------------------------
   Codes and tokens
   ------------------------------------------------------------------------- */

/** No 0/O, 1/I/L: the code is read aloud and typed from transfer notes. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const CODE_LENGTH = 4

/**
 * "GC-7K3P": the campaign's prefix and 4 characters. About 920,000 codes per
 * prefix; the store checks uniqueness.
 */
export function generateOrderCode(prefix: string, random: (n: number) => Uint8Array = randomBytes) {
  const bytes = random(CODE_LENGTH)
  let code = ""
  for (const byte of bytes) {
    // 31 symbols: the modulo bias over 256 is under 1% and harmless here.
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return `${prefix}-${code}`
}

/** What staff or a buyer typed, reduced to letters and digits: "gc 7k3p" → "GC7K3P". Null when it can't be a code. */
export function cleanOrderCode(input: string) {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "")
  return raw.length >= CODE_LENGTH && raw.length <= CODE_LENGTH + 3 ? raw : null
}

/**
 * The codes a cleaned input could mean, given the campaigns' prefixes:
 * "GC7K3P" → GC-7K3P; a bare "7K3P" → one per prefix.
 */
export function orderCodeCandidates(cleaned: string, prefixes: string[]) {
  if (cleaned.length === CODE_LENGTH) return prefixes.map((p) => `${p}-${cleaned}`)
  const prefix = cleaned.slice(0, -CODE_LENGTH)
  return prefixes.includes(prefix) ? [`${prefix}-${cleaned.slice(-CODE_LENGTH)}`] : []
}

/** 192 random bits, URL-safe: the buyer's secret link and QR. */
export function generateToken(random: (n: number) => Uint8Array = randomBytes) {
  return Buffer.from(random(24)).toString("base64url")
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/

export function isToken(value: string) {
  return TOKEN_PATTERN.test(value)
}

/**
 * What the booth scanner read or staff typed: the order link from the QR
 * (any host, so a test QR still works), a bare token, or a short code.
 */
export function parseScan(input: string): { token: string } | { code: string } | null {
  const text = input.trim()
  const fromLink = /\/orders\/([A-Za-z0-9_-]{32})(?:[/?#]|$)/.exec(text)
  if (fromLink) return { token: fromLink[1]! }
  if (isToken(text)) return { token: text }
  if (text.includes("/")) return null
  const code = cleanOrderCode(text)
  return code ? { code } : null
}

function randomBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n))
}

/* -------------------------------------------------------------------------
   Pricing a cart and reserving its stock
   ------------------------------------------------------------------------- */

export interface PricedCart {
  items: OrderItem[]
  totalFen: number
  /** Products whose variant counters changed, to write back. */
  updatedProducts: Product[]
}

/**
 * Prices `lines` from the stored products and bundles (never from the
 * client) and reserves their units on `channel`. Products and bundles of
 * other campaigns count as missing. A bundle may contain products that are
 * not sold on their own, or not on sale now. `capped` is false for a
 * campaign without a booth, whose online cap means nothing. A product sold
 * on its own must be on sale at `now` (For sale, inside its sale dates).
 * Throws the cart's errors, PRODUCT_UNAVAILABLE or SOLD_OUT.
 */
export function priceAndReserve(
  lines: CartLine[],
  products: Map<string, Product>,
  bundles: Map<string, Bundle>,
  channel: Channel,
  campaignId: string,
  { capped = true, now = new Date() }: { capped?: boolean; now?: Date } = {}
): PricedCart {
  const updated = new Map<string, Product>()
  const items: OrderItem[] = []

  /** Takes `qty` units of a variant, counting what earlier lines took. */
  const take = (productId: string, variantId: string, qty: number, alone: boolean) => {
    const product = updated.get(productId) ?? products.get(productId)
    if (!product || product.campaignId !== campaignId || (alone && !isOnSale(product, now))) {
      throw new ShopError("PRODUCT_UNAVAILABLE")
    }
    const index = product.variants.findIndex((v) => v.id === variantId)
    const variant = product.variants[index]
    if (!variant) throw new ShopError("PRODUCT_UNAVAILABLE")
    updated.set(product.id, replaceVariant(product, index, reserve(variant, qty, channel, capped)))
    return { product, variant }
  }

  for (const line of parseCart(lines)) {
    if (!isBundleLine(line)) {
      const { product, variant } = take(line.productId, line.variantId, line.qty, true)
      items.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantLabel: variant.label,
        priceFen: variant.priceFen,
        qty: line.qty,
        pickedUp: channel === "walkin",
      })
      continue
    }

    const bundle = bundles.get(line.bundleId)
    if (!bundle || !bundle.active || bundle.campaignId !== campaignId) {
      throw new ShopError("PRODUCT_UNAVAILABLE")
    }
    if (line.picks.length !== bundle.components.length) throw new ShopError("INVALID_CART")
    const contents: BundleUnit[] = bundle.components.map((component, i) => {
      const { product, variant } = take(component.productId, line.picks[i]!, component.qty * line.qty, false)
      return {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantLabel: variant.label,
        qty: component.qty,
      }
    })
    items.push({
      bundleId: bundle.id,
      name: bundle.name,
      variantLabel: contentsLabel(contents),
      priceFen: bundle.priceFen,
      qty: line.qty,
      pickedUp: channel === "walkin",
      contents,
    })
  }

  return {
    items,
    totalFen: items.reduce((sum, item) => sum + item.priceFen * item.qty, 0),
    updatedProducts: [...updated.values()],
  }
}

export function isBundleItem(item: OrderItem): item is BundleItem {
  return "bundleId" in item
}

/** The variant units `items` took from stock: a bundle's contents, times how many bundles. */
export function stockUnits(items: OrderItem[]) {
  return items.flatMap((item) =>
    isBundleItem(item)
      ? item.contents.map((u) => ({ productId: u.productId, variantId: u.variantId, qty: u.qty * item.qty }))
      : [{ productId: item.productId, variantId: item.variantId, qty: item.qty }]
  )
}

/**
 * Gives back the units of `items`, taken on `channel`. Products or variants
 * that no longer exist are skipped. Returns the products to write back.
 */
export function releaseItems(
  items: OrderItem[],
  channel: Channel,
  products: Map<string, Product>
): Product[] {
  const updated = new Map<string, Product>()
  for (const unit of stockUnits(items)) {
    const product = updated.get(unit.productId) ?? products.get(unit.productId)
    if (!product) continue
    const index = product.variants.findIndex((v) => v.id === unit.variantId)
    const variant = product.variants[index]
    if (!variant) continue
    updated.set(product.id, replaceVariant(product, index, release(variant, unit.qty, channel)))
  }
  return [...updated.values()]
}

function replaceVariant(product: Product, index: number, variant: Variant): Product {
  const variants = product.variants.slice()
  variants[index] = variant
  return { ...product, variants }
}

/* -------------------------------------------------------------------------
   Deadlines and limits. Status changes are in lifecycle.ts.
   ------------------------------------------------------------------------- */

/** True when the order is waiting for payment and its deadline has passed. */
export function isPastDeadline(order: Pick<Order, "status" | "expiresAt">, now: Date) {
  return (
    order.status === "pending_payment" &&
    order.expiresAt !== null &&
    order.expiresAt.getTime() <= now.getTime()
  )
}

/**
 * Whether online orders are taken now. A draft campaign isn't open yet; a
 * closed one, or one offering neither Delivery nor Pickup, is closed
 * whatever its dates. A missing date is no limit on that side.
 */
export function onlineWindowState(campaign: Campaign, now: Date) {
  if (campaign.status === "draft") return "not_open" as const
  if (campaign.status === "closed") return "closed" as const
  if (!campaign.offers.delivery && !campaign.offers.pickup) return "closed" as const
  if (campaign.onlineOpensAt && now < campaign.onlineOpensAt) return "not_open" as const
  if (campaign.onlineClosesAt && now >= campaign.onlineClosesAt) return "closed" as const
  return "open" as const
}

export function paymentDeadline(campaign: Campaign, from: Date) {
  return new Date(from.getTime() + campaign.paymentWindowMinutes * 60_000)
}

/** The most unpaid online orders one WeChat ID, or one device, may hold at once. */
export const MAX_UNPAID_PER_BUYER = 2
export const MAX_UNPAID_PER_DEVICE = 3

/** Online orders that hold stock without payment: waiting for proof, deadline not passed. */
export function countUnpaid(orders: Order[], campaignId: string, now: Date) {
  return orders.filter(
    (o) => o.campaignId === campaignId && o.status === "pending_payment" && !isPastDeadline(o, now)
  ).length
}

/**
 * Changes whenever the buyer's page would look different: status, pickup
 * progress, a verdict on the proof. The page polls it to refresh itself.
 */
export function orderVersion(order: Order) {
  const picked = order.items.filter((i) => i.pickedUp).length
  return [
    order.status,
    picked,
    order.payment.submittedAt?.getTime() ?? 0,
    order.payment.verifiedAt?.getTime() ?? 0,
    order.rejections.length,
    order.delivery?.sentAt?.getTime() ?? 0,
  ].join(".")
}

/** Statuses that can still change on their own or by Danus. */
export function isOpenStatus(status: OrderStatus) {
  return status === "pending_payment" || status === "awaiting_verification" || status === "paid"
}

/** The rejection the buyer still has to act on: the last one, while the order waits for payment. */
export function openRejection(order: Order) {
  return order.status === "pending_payment" ? order.rejections.at(-1) : undefined
}

/* -------------------------------------------------------------------------
   Refunds. The money goes back outside the app; an admin records it.
   ------------------------------------------------------------------------- */

/**
 * What a canceled or expired online order should get back: the items not
 * handed over, and the delivery fee of a delivery order never delivered.
 */
export function refundDue(order: Order) {
  const items = order.items.reduce((sum, item) => (item.pickedUp ? sum : sum + item.priceFen * item.qty), 0)
  const fee = order.delivery && order.status !== "picked_up" ? order.delivery.feeFen : 0
  return items + fee
}

/**
 * A canceled online order whose money Danus has, or whose proof was still
 * waiting to be checked, and whose refund is not recorded yet. An expired
 * order never had a proof accepted; a buyer who paid late contacts Danus.
 */
export function awaitsRefund(order: Order) {
  if (order.channel !== "online" || order.status !== "cancelled" || order.refund) return false
  if (refundDue(order) === 0) return false
  const { verifiedAt, submittedAt } = order.payment
  const lastRejection = order.rejections.at(-1)?.at
  const uncheckedProof = !!submittedAt && (!lastRejection || submittedAt > lastRejection)
  return !!verifiedAt || uncheckedProof
}

/* -------------------------------------------------------------------------
   The buyer's route: Order → Pay → Verify → Pick up (or Delivery)
   ------------------------------------------------------------------------- */

export const ORDER_ROUTE = ["Order", "Pay", "Verify", "Pick up"] as const
export const DELIVERY_ROUTE = ["Order", "Pay", "Verify", "Delivery"] as const

/** The station the order is at, or null when it left the route. */
export function routeStage(status: OrderStatus): number | null {
  switch (status) {
    case "pending_payment":
      return 1
    case "awaiting_verification":
      return 2
    case "paid":
    case "picked_up":
      return 3
    default:
      return null
  }
}
