import { Timestamp, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore"

import type {
  Bundle,
  Buyer,
  Campaign,
  Delivery,
  DeliverySlot,
  Order,
  Payment,
  Product,
  Refund,
  Rejection,
} from "../domain/types"

/*
 * Firestore documents ↔ domain types. Dates are stored as Timestamps;
 * everything else is stored as is. Documents never contain their own id.
 */

/**
 * Drops undefined fields, which Firestore rejects, from plain objects at any
 * depth. Timestamps and other class instances are left alone.
 */
export function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact) as T
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return value
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, compact(v)])
  ) as T
}

const toDate = (value: unknown): Date => (value as Timestamp).toDate()
const toDateOrNull = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null
const toDateOrUndefined = (value: unknown): Date | undefined =>
  value instanceof Timestamp ? value.toDate() : undefined

export function campaignFromDoc(snap: DocumentSnapshot): Campaign {
  const d = snap.data()!
  return {
    id: snap.id,
    name: d.name,
    slug: d.slug,
    codePrefix: d.codePrefix,
    tagline: d.tagline ?? "",
    coverImagePath: d.coverImagePath,
    featuredProductId: d.featuredProductId,
    sortOrder: d.sortOrder ?? 0,
    status: d.status,
    onlineOpensAt: toDateOrNull(d.onlineOpensAt),
    onlineClosesAt: toDateOrNull(d.onlineClosesAt),
    offers: { delivery: false, pickup: true, booth: true, ...d.offers },
    pickupInfo: d.pickupInfo ?? "",
    deliveryFeeFen: d.deliveryFeeFen ?? 0,
    deliverySlots: ((d.deliverySlots ?? []) as DocumentData[]).map(slotFromDoc),
    paymentAccounts: d.paymentAccounts ?? [],
    paymentWindowMinutes: d.paymentWindowMinutes,
  }
}

export function campaignToDoc({ id: _id, ...c }: Campaign): DocumentData {
  return compact({
    ...c,
    onlineOpensAt: c.onlineOpensAt && Timestamp.fromDate(c.onlineOpensAt),
    onlineClosesAt: c.onlineClosesAt && Timestamp.fromDate(c.onlineClosesAt),
    deliverySlots: c.deliverySlots.map(slotToDoc),
  })
}

function slotFromDoc(d: DocumentData): DeliverySlot {
  return { id: d.id, startsAt: toDate(d.startsAt), endsAt: toDate(d.endsAt), maxOrders: d.maxOrders ?? null }
}

function slotToDoc(s: DeliverySlot): DocumentData {
  return { ...s, startsAt: Timestamp.fromDate(s.startsAt), endsAt: Timestamp.fromDate(s.endsAt) }
}

function deliveryFromDoc(d: DocumentData | undefined): Delivery | undefined {
  if (!d) return undefined
  return {
    address: d.address,
    slot: slotFromDoc(d.slot),
    feeFen: d.feeFen ?? 0,
    courier: d.courier,
    trackingNumber: d.trackingNumber,
    sentAt: toDateOrUndefined(d.sentAt),
    sentBy: d.sentBy,
  }
}

function deliveryToDoc(d: Delivery): DocumentData {
  return { ...d, slot: slotToDoc(d.slot), sentAt: d.sentAt && Timestamp.fromDate(d.sentAt) }
}

export function productFromDoc(snap: DocumentSnapshot): Product {
  const d = snap.data()!
  return {
    id: snap.id,
    campaignId: d.campaignId,
    name: d.name,
    description: d.description ?? "",
    category: d.category,
    imagePath: d.imagePath,
    sizeChart: d.sizeChart,
    sizeChartPath: d.sizeChartPath,
    active: d.active,
    allowNickname: d.allowNickname === true || undefined,
    tags: d.tags ?? [],
    allergens: d.allergens ?? [],
    onSaleFrom: toDateOrUndefined(d.onSaleFrom),
    onSaleUntil: toDateOrUndefined(d.onSaleUntil),
    sortOrder: d.sortOrder ?? 0,
    variants: d.variants,
  }
}

export function productToDoc({ id: _id, ...p }: Product): DocumentData {
  return compact({
    ...p,
    onSaleFrom: p.onSaleFrom && Timestamp.fromDate(p.onSaleFrom),
    onSaleUntil: p.onSaleUntil && Timestamp.fromDate(p.onSaleUntil),
  })
}

export function bundleFromDoc(snap: DocumentSnapshot): Bundle {
  const d = snap.data()!
  return {
    id: snap.id,
    campaignId: d.campaignId,
    name: d.name,
    description: d.description ?? "",
    imagePath: d.imagePath,
    priceFen: d.priceFen,
    active: d.active,
    sortOrder: d.sortOrder ?? 0,
    components: d.components ?? [],
  }
}

export function bundleToDoc({ id: _id, ...b }: Bundle): DocumentData {
  return compact(b)
}

function paymentFromDoc(d: DocumentData | undefined): Payment {
  if (!d) return {}
  return {
    method: d.method,
    accountId: d.accountId,
    proofPath: d.proofPath,
    transactionDigits: d.transactionDigits,
    submittedAt: toDateOrUndefined(d.submittedAt),
    verifiedAt: toDateOrUndefined(d.verifiedAt),
    verifiedBy: d.verifiedBy,
  }
}

function rejectionsFromDoc(list: DocumentData[] | undefined): Rejection[] {
  return (list ?? []).map((r) => ({
    reason: r.reason,
    at: toDate(r.at),
    by: r.by,
    proofPath: r.proofPath,
    transactionDigits: r.transactionDigits,
  }))
}

function paymentToDoc(p: Payment): DocumentData {
  return {
    ...p,
    submittedAt: p.submittedAt && Timestamp.fromDate(p.submittedAt),
    verifiedAt: p.verifiedAt && Timestamp.fromDate(p.verifiedAt),
  }
}

export function orderFromDoc(snap: DocumentSnapshot): Order {
  const d = snap.data()!
  return {
    id: snap.id,
    code: d.code,
    token: d.token,
    campaignId: d.campaignId,
    channel: d.channel,
    buyer: d.buyer ? buyerFromDoc(d.buyer) : null,
    items: d.items,
    totalFen: d.totalFen,
    delivery: deliveryFromDoc(d.delivery),
    status: d.status,
    payment: paymentFromDoc(d.payment),
    rejections: rejectionsFromDoc(d.rejections),
    createdAt: toDate(d.createdAt),
    expiresAt: toDateOrNull(d.expiresAt),
    pickedUpAt: toDateOrNull(d.pickedUpAt),
    handledBy: d.handledBy ?? null,
    cancelReason: d.cancelReason,
    cancelledBy: d.cancelledBy,
    cancelledAt: toDateOrUndefined(d.cancelledAt),
    refund: d.refund && { ...(d.refund as Omit<Refund, "at">), at: toDate(d.refund.at) },
    deviceKey: d.deviceKey,
    test: d.test === true || undefined,
  }
}

export function orderToDoc({ id: _id, ...o }: Order): DocumentData {
  return compact({
    ...o,
    payment: paymentToDoc(o.payment),
    delivery: o.delivery && deliveryToDoc(o.delivery),
    // Query only, never read back: the slot limit counts orders by slot.
    slotKey: o.delivery ? `${o.campaignId}/${o.delivery.slot.id}` : undefined,
    rejections: o.rejections.map((r) => ({ ...r, at: Timestamp.fromDate(r.at) })),
    createdAt: Timestamp.fromDate(o.createdAt),
    expiresAt: o.expiresAt && Timestamp.fromDate(o.expiresAt),
    pickedUpAt: o.pickedUpAt && Timestamp.fromDate(o.pickedUpAt),
    cancelledAt: o.cancelledAt && Timestamp.fromDate(o.cancelledAt),
    refund: o.refund && { ...o.refund, at: Timestamp.fromDate(o.refund.at) },
    // Query only, never read back: an account's orders and its unpaid-orders limit.
    buyerUid: o.buyer?.uid || undefined,
  })
}

/** Orders from before accounts have no uid or email. */
function buyerFromDoc(d: DocumentData): Buyer {
  return { uid: d.uid ?? "", email: d.email ?? "", name: d.name, wechatId: d.wechatId, phone: d.phone ?? "" }
}
