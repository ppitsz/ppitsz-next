import { ShopError } from "./errors"
import type { Channel, Variant } from "./types"

/*
 * Stock is a pair of counters per variant: units taken by online orders and
 * units sold at the booth. Online orders are also limited by the variant's cap,
 * so part of the stock is always left for walk-ins. A campaign without a
 * booth has no walk-ins to keep stock for, so `capped` is false there.
 */

export interface Availability {
  /** Units left in total: what the kasir can still sell. */
  remaining: number
  /** Units a new online order can still take. */
  onlineRemaining: number
}

export function availability(variant: Variant, capped = true): Availability {
  const remaining = Math.max(0, variant.stock - variant.onlineOrdered - variant.walkIn)
  const capLeft =
    variant.onlineCap === null || !capped
      ? remaining
      : Math.max(0, variant.onlineCap - variant.onlineOrdered)
  return { remaining, onlineRemaining: Math.min(remaining, capLeft) }
}

export function availableFor(variant: Variant, channel: Channel, capped = true) {
  const a = availability(variant, capped)
  return channel === "online" ? a.onlineRemaining : a.remaining
}

/** Takes `qty` units, or throws SOLD_OUT. Returns a new variant. */
export function reserve(variant: Variant, qty: number, channel: Channel, capped = true): Variant {
  assertQty(qty)
  if (availableFor(variant, channel, capped) < qty) {
    throw new ShopError("SOLD_OUT")
  }
  return channel === "online"
    ? { ...variant, onlineOrdered: variant.onlineOrdered + qty }
    : { ...variant, walkIn: variant.walkIn + qty }
}

/** Gives `qty` units back, for an expired or canceled order. */
export function release(variant: Variant, qty: number, channel: Channel): Variant {
  assertQty(qty)
  return channel === "online"
    ? { ...variant, onlineOrdered: Math.max(0, variant.onlineOrdered - qty) }
    : { ...variant, walkIn: Math.max(0, variant.walkIn - qty) }
}

function assertQty(qty: number) {
  if (!Number.isInteger(qty) || qty < 1) {
    throw new RangeError(`Quantity must be a positive integer, got ${qty}`)
  }
}
