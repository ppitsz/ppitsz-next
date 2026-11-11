import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"

import { campaignPhase } from "./domain/campaign"
import type { Campaign, DeliverySlot } from "./domain/types"

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
  if (phase === "upcoming" && opens) return `Online ordering opens ${at(opens)}`
  if (phase === "online") return closes ? `Order online until ${at(closes)}` : "Order online any time"
  if (phase === "booth") {
    const online = campaign.offers.delivery || campaign.offers.pickup
    return `${online ? "Online ordering has closed. " : ""}Buy in person at ${campaign.pickupInfo}`
  }
  return "Online ordering has closed"
}

/** "Delivered (¥5 delivery) or pick up at the Danus booth." Empty when nothing is sold online. */
export function fulfillmentNote(campaign: Campaign) {
  const { delivery, pickup } = campaign.offers
  const fee = campaign.deliveryFeeFen === 0 ? "free delivery" : `${formatYuan(campaign.deliveryFeeFen)} delivery`
  if (delivery && pickup) return `Delivered (${fee}) or pick up at ${campaign.pickupInfo}.`
  if (delivery) return `Delivered to your address, ${fee}.`
  if (pickup) return `Pick up your order at ${campaign.pickupInfo}.`
  return ""
}

/** "Sat, Mar 13 · 15:00–18:00", Shenzhen time. */
export function slotLabel(slot: Pick<DeliverySlot, "startsAt" | "endsAt">) {
  return `${formatDate(slot.startsAt)} · ${formatTime(slot.startsAt)}–${formatTime(slot.endsAt)}`
}
