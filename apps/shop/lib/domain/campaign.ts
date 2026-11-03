import { MAX_DELIVERY_FEE_FEN, MAX_SLOT_ORDERS, MAX_SLOTS, offersOnline } from "./delivery"
import type { Campaign, CampaignOffers, CampaignStatus, DeliverySlot } from "./types"

/*
 * Campaign settings and where a campaign stands. Several campaigns can be
 * open at once; each has its own URL name (slug) and order code prefix.
 *
 * checkCampaignEdit holds every rule. The settings action runs it to show the
 * first problem; the store runs it again in its transaction, against the
 * campaigns as they are then.
 */

/** Top-level paths the site uses itself, so no campaign can take them. */
export const RESERVED_SLUGS = ["orders", "staff", "media", "avatars", "api", "sign-in", "sign-up", "account", "forgot-password", "reset-password"]

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
const PREFIX_PATTERN = /^[A-Z]{2,3}$/
export const MAX_TAGLINE_LENGTH = 120
export const MAX_CAMPAIGN_SORT_ORDER = 999

export interface CampaignEdit {
  name: string
  slug: string
  codePrefix: string
  tagline: string
  pickupInfo: string
  onlineOpensAt: Date | null
  onlineClosesAt: Date | null
  offers: CampaignOffers
  deliveryFeeFen: number
  deliverySlots: DeliverySlot[]
  paymentWindowMinutes: number
  sortOrder: number
  status: CampaignStatus
  /** Checked against the campaign's products by the store. */
  featuredProductId?: string | null
}

export interface CampaignIssue {
  field: keyof CampaignEdit
  message: string
}

/**
 * Every problem with `edit`. `current` is the stored campaign (null for a
 * new one), `others` every other campaign, and `hasOrders` whether the
 * current one has any order, which fixes its slug and prefix.
 */
export function checkCampaignEdit(
  edit: CampaignEdit,
  { current, others, hasOrders }: { current: Campaign | null; others: Campaign[]; hasOrders: boolean }
): CampaignIssue[] {
  const issues: CampaignIssue[] = []
  const add = (field: keyof CampaignEdit, message: string) => issues.push({ field, message })

  const name = edit.name.trim()
  if (name.length < 2) add("name", "Write the campaign name.")
  else if (name.length > 60) add("name", "The campaign name can be at most 60 characters.")

  if (!SLUG_PATTERN.test(edit.slug)) {
    add("slug", "The URL name can only have lowercase letters, numbers and hyphens, up to 40, like gumamchan.")
  } else if (RESERVED_SLUGS.includes(edit.slug)) {
    add("slug", `"${edit.slug}" is used by another page. Pick another one.`)
  } else if (edit.status !== "closed") {
    const taken = others.find((c) => c.slug === edit.slug && c.status !== "closed")
    if (taken) add("slug", `"${edit.slug}" is in use by ${taken.name}. End that campaign first, or pick another one.`)
  }

  if (!PREFIX_PATTERN.test(edit.codePrefix)) {
    add("codePrefix", "Order codes start with 2 or 3 capital letters, like GC.")
  } else {
    const taken = others.find((c) => c.codePrefix === edit.codePrefix)
    if (taken) add("codePrefix", `The prefix ${edit.codePrefix} is already used by ${taken.name}.`)
  }

  if (current && hasOrders) {
    if (edit.slug !== current.slug) add("slug", "The URL name can't change once there are orders, so old links keep working.")
    if (edit.codePrefix !== current.codePrefix) add("codePrefix", "The code prefix can't change once there are orders.")
  }

  if (edit.tagline.trim().length > MAX_TAGLINE_LENGTH) add("tagline", `The tagline can be at most ${MAX_TAGLINE_LENGTH} characters.`)

  const { offers } = edit
  if (!offers.delivery && !offers.pickup && !offers.booth) add("offers", "Choose at least one: Delivery, Pickup or Booth.")
  // The pickup place is where pickup orders are collected and where the booth is.
  const pickup = edit.pickupInfo.trim()
  if (offers.pickup || offers.booth) {
    if (pickup.length < 5) add("pickupInfo", "Write the place and time of pickup or the booth.")
  }
  if (pickup.length > 120) add("pickupInfo", "The pickup info can be at most 120 characters.")
  if (edit.onlineOpensAt && edit.onlineClosesAt && edit.onlineClosesAt <= edit.onlineOpensAt) {
    add("onlineClosesAt", "Online ordering must close after it opens.")
  }
  if (offers.delivery) {
    const fee = edit.deliveryFeeFen
    if (!Number.isInteger(fee) || fee < 0 || fee > MAX_DELIVERY_FEE_FEN) add("deliveryFeeFen", "The delivery fee is ¥0 to ¥200.")
    const slotIssue = checkSlots(edit.deliverySlots)
    if (slotIssue) add("deliverySlots", slotIssue)
  }
  const minutes = edit.paymentWindowMinutes
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 48 * 60) {
    add("paymentWindowMinutes", "The payment window is 15 minutes to 48 hours.")
  }
  const order = edit.sortOrder
  if (!Number.isInteger(order) || order < 0 || order > MAX_CAMPAIGN_SORT_ORDER) {
    add("sortOrder", `The order must be a whole number from 0 to ${MAX_CAMPAIGN_SORT_ORDER}.`)
  }
  return issues
}

function checkSlots(slots: DeliverySlot[]) {
  if (slots.length === 0) return "Add at least one delivery slot."
  if (slots.length > MAX_SLOTS) return `At most ${MAX_SLOTS} delivery slots.`
  if (new Set(slots.map((s) => s.id)).size !== slots.length) return "A delivery slot appears twice. Reload the page."
  for (const slot of slots) {
    if (slot.endsAt <= slot.startsAt) return "Every delivery slot must end after it starts."
    const max = slot.maxOrders
    if (max !== null && (!Number.isInteger(max) || max < 1 || max > MAX_SLOT_ORDERS)) {
      return `The order limit per slot is 1 to ${MAX_SLOT_ORDERS}, or empty.`
    }
  }
  return null
}

/** "SZ Cup 2027" → "sz-cup-2027": a starting point for the slug field. */
export function suggestSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
}

/**
 * Where a campaign stands for buyers: a draft or closed campaign, or an open
 * one before, during or after its online order window. After it (or with no
 * online ordering at all) a campaign with a booth still sells there; one
 * without has ended for now. Labels: STATUSES.campaign in @ppitsz/ui/lib/network.
 */
export type CampaignPhase = "draft" | "upcoming" | "online" | "booth" | "ended" | "closed"

export function campaignPhase(
  campaign: Pick<Campaign, "status" | "onlineOpensAt" | "onlineClosesAt" | "offers">,
  now: Date
): CampaignPhase {
  if (campaign.status !== "open") return campaign.status
  if (offersOnline(campaign)) {
    if (campaign.onlineOpensAt && now < campaign.onlineOpensAt) return "upcoming"
    if (!campaign.onlineClosesAt || now < campaign.onlineClosesAt) return "online"
  }
  return campaign.offers.booth ? "booth" : "ended"
}

/** Campaigns as the main page and the switchers list them. */
export function byDisplayOrder<T extends Pick<Campaign, "sortOrder" | "name">>(campaigns: T[]) {
  return [...campaigns].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}
