import { ShopError } from "./errors"
import type { Campaign, Order, PickupPoint, Product } from "./types"

/*
 * Pickup points: where and when pickup orders are collected. A campaign
 * lists several, each a place with a time range on one day (one day can have
 * several, at separate places), and the buyer picks one at checkout. A
 * product can be limited to some of them (food made fresh for one day, or
 * merch that is only at the booth); the cart then only offers the points
 * every item allows.
 */

export const MAX_PICKUP_POINTS = 20
export const MAX_PLACE_LENGTH = 80
export const POINT_ID_PATTERN = /^[a-z0-9-]{1,40}$/

export type PickupPointState = "open" | "started"

/** A point closes to new orders once it starts: a proof still has to be checked before pickup. */
export function pickupPointState(point: Pick<PickupPoint, "startsAt">, now: Date): PickupPointState {
  return now >= point.startsAt ? "started" : "open"
}

/**
 * The pickup points every one of `products` allows, by id, or null when none
 * is limited to some points. An empty list means no point suits them all.
 */
export function sharedPickupPoints(products: Pick<Product, "pickupPointIds">[]): string[] | null {
  let shared: string[] | null = null
  for (const { pickupPointIds } of products) {
    if (!pickupPointIds?.length) continue
    shared = shared ? shared.filter((id) => pickupPointIds.includes(id)) : [...pickupPointIds]
  }
  return shared
}

/**
 * The point a buyer asked for. Throws PICKUP_POINT_UNAVAILABLE when it is
 * gone or has started, and NOT_AT_PICKUP_POINT, naming the items, when some
 * of `products` aren't picked up there.
 */
export function pickPickupPoint(
  campaign: Pick<Campaign, "pickupPoints">,
  pointId: string,
  products: Pick<Product, "name" | "pickupPointIds">[],
  now: Date
): PickupPoint {
  const point = campaign.pickupPoints.find((p) => p.id === pointId)
  if (!point || pickupPointState(point, now) !== "open") throw new ShopError("PICKUP_POINT_UNAVAILABLE")
  const unsuited = products.filter((p) => p.pickupPointIds?.length && !p.pickupPointIds.includes(point.id))
  if (unsuited.length > 0) {
    throw new ShopError("NOT_AT_PICKUP_POINT", `Not there: ${[...new Set(unsuited.map((p) => p.name))].join(", ")}.`)
  }
  return point
}

/** Staff may move a pickup order to another point until it is picked up, canceled or expired. */
export function canChangePickupPoint(order: Pick<Order, "channel" | "delivery" | "status">) {
  return (
    order.channel === "online" &&
    !order.delivery &&
    (order.status === "pending_payment" || order.status === "awaiting_verification" || order.status === "paid")
  )
}

/** Points in time order. */
export function byPointTime<T extends Pick<PickupPoint, "startsAt" | "endsAt">>(points: T[]) {
  return [...points].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.endsAt.getTime() - b.endsAt.getTime()
  )
}
