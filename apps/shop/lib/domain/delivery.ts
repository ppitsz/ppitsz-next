import { ShopError } from "./errors"
import { isPastDeadline } from "./order"
import { HOLDING_STATUSES, type Campaign, type DeliverySlot, type Order, type OrderStatus } from "./types"

/*
 * Delivery and Pickup. An online order with a
 * `delivery` is delivered whole, by a Danus member or a courier; one without
 * is collected at the campaign's pickup, as before.
 */

export const FULFILLMENTS = ["delivery", "pickup", "booth"] as const
/** How an order reaches its buyer: delivered, collected, or bought at the booth. */
export type Fulfillment = (typeof FULFILLMENTS)[number]

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  booth: "Booth",
}

export const MAX_ADDRESS_LENGTH = 200
export const MAX_COURIER_LENGTH = 40
export const MAX_TRACKING_LENGTH = 40
export const MAX_SLOTS = 20
export const MAX_SLOT_ORDERS = 999
/** ¥200: a sanity limit on the delivery fee. */
export const MAX_DELIVERY_FEE_FEN = 20_000

export function fulfillmentOf(order: Pick<Order, "channel" | "delivery">): Fulfillment {
  if (order.channel === "walkin") return "booth"
  return order.delivery ? "delivery" : "pickup"
}

/** True when buyers can order this campaign online at all, dates aside. */
export function offersOnline(campaign: Pick<Campaign, "offers">) {
  return campaign.offers.delivery || campaign.offers.pickup
}

/** Orders that take a place in a slot: live delivery orders, not overdue ones. */
export function slotPlacesTaken(orders: Order[], slotId: string, now: Date) {
  return orders.filter(
    (o) =>
      o.delivery?.slot.id === slotId && HOLDING_STATUSES.includes(o.status) && !isPastDeadline(o, now)
  ).length
}

export type SlotState = "open" | "full" | "started"

/** Whether a buyer can still pick `slot`, given how many places are taken. */
export function slotState(slot: DeliverySlot, taken: number, now: Date): SlotState {
  if (now >= slot.startsAt) return "started"
  if (slot.maxOrders !== null && taken >= slot.maxOrders) return "full"
  return "open"
}

/** The slot a buyer asked for, or SLOT_UNAVAILABLE when it is gone, started or full. */
export function pickSlot(campaign: Campaign, slotId: string, taken: number, now: Date): DeliverySlot {
  const slot = campaign.deliverySlots.find((s) => s.id === slotId)
  if (!slot || slotState(slot, taken, now) !== "open") throw new ShopError("SLOT_UNAVAILABLE")
  return slot
}

/** The address as stored, or INVALID_DELIVERY when it is missing or too long; a phone is required too. */
export function deliveryDetails(address: string, phone: string) {
  const clean = address.trim().replace(/\s+/g, " ")
  if (clean.length < 5 || clean.length > MAX_ADDRESS_LENGTH || !phone.trim()) {
    throw new ShopError("INVALID_DELIVERY")
  }
  return clean
}

/**
 * Checks a fulfillment the buyer picked against what the campaign offers.
 * Throws FULFILLMENT_UNAVAILABLE.
 */
export function assertFulfillment(campaign: Campaign, fulfillment: "delivery" | "pickup") {
  if (!campaign.offers[fulfillment]) throw new ShopError("FULFILLMENT_UNAVAILABLE")
}

/** An order's status, plus the two a delivery order shows instead: on its way, delivered. */
export type ShownStatus = OrderStatus | "sending" | "delivered"

/**
 * The status as buyers and staff read it: a paid delivery order handed to a
 * courier is "sending", and a finished one "delivered". Labels:
 * STATUSES.order in @ppitsz/ui/lib/network.
 */
export function displayStatus(order: Pick<Order, "status" | "delivery">): ShownStatus {
  if (order.delivery && order.status === "paid" && order.delivery.sentAt) return "sending"
  if (order.delivery && order.status === "picked_up") return "delivered"
  return order.status
}

/** Paid delivery orders not yet delivered: the delivery list. */
export function awaitsDelivery(order: Order) {
  return !!order.delivery && order.status === "paid"
}

export interface SlotGroup {
  slot: DeliverySlot
  orders: Order[]
}

/**
 * delivery orders still to deliver, grouped by the slot they picked, earliest
 * first; inside a slot, oldest order first. Orders keep a copy of their
 * slot, so a slot changed or removed later still groups its orders.
 */
export function deliveryList(orders: Order[]): SlotGroup[] {
  const groups = new Map<string, SlotGroup>()
  for (const order of orders.filter(awaitsDelivery)) {
    const slot = order.delivery!.slot
    const key = `${order.campaignId}/${slot.id}/${slot.startsAt.getTime()}`
    const group = groups.get(key) ?? { slot, orders: [] }
    group.orders.push(order)
    groups.set(key, group)
  }
  return [...groups.values()]
    .sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime() || a.slot.endsAt.getTime() - b.slot.endsAt.getTime())
    .map((g) => ({ ...g, orders: g.orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) }))
}

/** Slots in time order. */
export function bySlotTime<T extends Pick<DeliverySlot, "startsAt">>(slots: T[]) {
  return [...slots].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}
