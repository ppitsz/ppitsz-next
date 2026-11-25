import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"

import { campaignPhase } from "./domain/campaign"
import type { Campaign, DeliverySlot, Order, PickupPoint } from "./domain/types"

/*
 * The sentences buyers read about a campaign on the main page and above its
 * catalog: when they can order, and how the order reaches them.
 */

const at = (date: Date) => `${formatDate(date)} at ${formatTime(date)} Shenzhen time`

/** "Order online until Mon, Mar 15 at 23:59 Shenzhen time", or what buyers can do instead. */
export function orderingNote(campaign: Campaign, now: Date) {
  const phase = campaignPhase(campaign, now)
  const opens = campaign.onlineOpensAt
  const closes = campaign.onlineClosesAt
  // Only staff see a draft.
  if (phase === "draft") return "Not open to buyers yet. Staff can place test orders now"
  if (phase === "upcoming" && opens) return `Online ordering opens ${at(opens)}`
  if (phase === "online") return closes ? `Order online until ${at(closes)}` : "Order online any time"
  if (phase === "booth") {
    const online = campaign.offers.delivery || campaign.offers.pickup
    return `${online ? "Online ordering has closed. " : ""}Buy in person at ${campaign.boothInfo}`
  }
  return "Online ordering has closed"
}

/** "Delivered (¥5 delivery) or picked up at PPIT booth." Empty when nothing is sold online. */
export function fulfillmentNote(campaign: Campaign) {
  const { delivery, pickup } = campaign.offers
  const fee = campaign.deliveryFeeFen === 0 ? "free delivery" : `${formatYuan(campaign.deliveryFeeFen)} delivery`
  const where = pickupPlacesNote(campaign.pickupPoints)
  if (delivery && pickup) return `Delivered (${fee}) or picked up ${where}.`
  if (delivery) return `Delivered to your address, ${fee}.`
  if (pickup) return `Pick up your order ${where}.`
  return ""
}

/** The places of `points`, each once. */
export function pickupPlaces(points: Pick<PickupPoint, "place">[]) {
  return [...new Set(points.map((p) => p.place))]
}

/** "at PPIT booth", or "at one of 3 pickup places" when there are several. */
export function pickupPlacesNote(points: Pick<PickupPoint, "place">[]) {
  const places = pickupPlaces(points)
  if (places.length === 1) return `at ${places[0]}`
  return places.length > 1 ? `at one of ${places.length} pickup places` : "at a pickup point"
}

/** "PPIT booth", or "3 pickup places": where a campaign's pickup orders go, in a few words. */
export function pickupWhere(points: Pick<PickupPoint, "place">[]) {
  const places = pickupPlaces(points)
  if (places.length === 1) return places[0]!
  return places.length > 1 ? `${places.length} pickup places` : "Pickup"
}

/**
 * Where a pickup order is collected: its point, or for an order from before
 * pickup points, any of the campaign's points (or the old pickup text).
 */
export function orderPickupNote(
  order: Pick<Order, "pickupPoint">,
  campaign: Pick<Campaign, "pickupPoints" | "boothInfo"> | undefined
) {
  if (order.pickupPoint) return pickupPointLabel(order.pickupPoint)
  const points = campaign?.pickupPoints ?? []
  if (points.length === 1) return pickupPointLabel(points[0]!)
  if (points.length > 1) return `Any of our pickup points: ${points.map(pickupPointLabel).join("; ")}`
  return campaign?.boothInfo || "the pickup place"
}

/**
 * "Pickup only at PPIT booth · Sat, Mar 13 · 10:00–16:00", for a product
 * limited to some of `points` (ids in `pointIds`); "Not for pickup" when none is left.
 */
export function pickupOnlyNote(pointIds: string[], points: Pick<PickupPoint, "id" | "place" | "startsAt" | "endsAt">[]) {
  const allowed = points.filter((p) => pointIds.includes(p.id))
  return allowed.length > 0 ? `Pickup only at ${allowed.map(pickupPointLabel).join(", or ")}` : "Not for pickup"
}

/** "PPIT booth · Sat, Mar 13 · 15:00–18:00", Shenzhen time. */
export function pickupPointLabel(point: Pick<PickupPoint, "place" | "startsAt" | "endsAt">) {
  return `${point.place} · ${slotLabel(point)}`
}

/** "Sat, Mar 13 · 15:00–18:00", Shenzhen time. */
export function slotLabel(slot: Pick<DeliverySlot, "startsAt" | "endsAt">) {
  return `${formatDate(slot.startsAt)} · ${formatTime(slot.startsAt)}–${formatTime(slot.endsAt)}`
}
