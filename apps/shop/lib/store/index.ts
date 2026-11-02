import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore"

import { ensureProfile, getProfile, saveProfile } from "@ppitsz/accounts/profile"

import { applyBundleEdit, type BundleEdit } from "../domain/bundle"
import { byDisplayOrder, checkCampaignEdit, type CampaignEdit } from "../domain/campaign"
import { isBundleLine, parseCart } from "../domain/cart"
import {
  assertFulfillment,
  awaitsDelivery,
  bySlotTime,
  deliveryDetails,
  pickSlot,
  slotPlacesTaken,
} from "../domain/delivery"
import { ShopError } from "../domain/errors"
import {
  applyCommand,
  refusal,
  type Actor,
  type OrderCommand,
  type StaffActor,
  type Transition,
} from "../domain/lifecycle"
import {
  cleanOrderCode,
  countUnpaid,
  generateOrderCode,
  generateToken,
  isPastDeadline,
  isToken,
  MAX_UNPAID_PER_BUYER,
  MAX_UNPAID_PER_DEVICE,
  orderCodeCandidates,
  paymentDeadline,
  onlineWindowState,
  priceAndReserve,
  releaseItems,
  stockUnits,
} from "../domain/order"
import { proofAccount, saleAccount } from "../domain/payment"
import { applyProductEdit, isUnsold, mergePaymentAccounts, type ProductEdit } from "../domain/product"
import type {
  Bundle,
  Buyer,
  Campaign,
  CartLine,
  Channel,
  Order,
  OrderItem,
  PaymentAccount,
  PaymentMethod,
  Product,
} from "../domain/types"
import { db } from "../firebase/admin"
import {
  bundleFromDoc,
  bundleToDoc,
  campaignFromDoc,
  campaignToDoc,
  orderFromDoc,
  orderToDoc,
  productFromDoc,
  productToDoc,
} from "./convert"
import {
  assertProofFile,
  chosenPath,
  copyImage,
  deleteMediaQuietly,
  deleteUnused,
  uploadChanges,
  uploadImage,
  uploadProof,
  type ImageChange,
  type ImageFile,
} from "./media"

export { readMedia, type ImageChange, type ImageFile } from "./media"

/*
 * All reads and writes of the shop's data. Every change to stock or order
 * status runs in a Firestore transaction, so two buyers can't take the same
 * last unit and two scanners can't hand over the same order twice. Status
 * changes are decided by lib/domain/lifecycle.ts; this module only loads,
 * runs and writes them.
 *
 * Overdue holds are settled wherever they could mislead: reading an order,
 * listing products or orders, and inside every transaction that takes stock.
 * The daily cron only tidies up campaigns nobody is looking at.
 *
 * Collections:
 *   campaigns/{id}      slug (URL name), codePrefix, status; several can be open at once
 *   products/{id}       campaignId, variants[] with stock counters
 *   bundles/{id}        campaignId, components[]; no stock, it takes its components'
 *   orders/{id}         token (secret), code (short); buyerUid (the account); slotKey for a delivery order's slot
 *   accounts/{uid}      the PPITSZ account's profile, shared by every app (@ppitsz/accounts/profile)
 *   orderCodes/{code}   { orderId } — makes codes unique
 *   checkouts/{id}      { orderId } — one order per checkout attempt or kasir sale (idempotency)
 *   rateLimits/{hash}   request counters, see rate-limit.ts
 */

const col = {
  campaigns: () => db().collection("campaigns"),
  products: () => db().collection("products"),
  bundles: () => db().collection("bundles"),
  orders: () => db().collection("orders"),
  orderCodes: () => db().collection("orderCodes"),
  checkouts: () => db().collection("checkouts"),
}

/** Checkout ids are random UUIDs made by the buyer's browser. */
export const CHECKOUT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/* -------------------------------------------------------------------------
   Reads
   ------------------------------------------------------------------------- */

/** Every campaign, in display order. A handful a year, so always all of them. */
export async function listCampaigns(): Promise<Campaign[]> {
  const snap = await col.campaigns().get()
  return byDisplayOrder(snap.docs.map(campaignFromDoc))
}

/**
 * The campaign at /[slug]: the draft or open one holding the slug, or else
 * the latest closed one that had it.
 */
export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  const snap = await col.campaigns().where("slug", "==", slug).get()
  const found = snap.docs.map(campaignFromDoc)
  return (
    found.find((c) => c.status !== "closed") ??
    found.sort((a, b) => lastDate(b) - lastDate(a))[0] ??
    null
  )
}

/** Roughly when a closed campaign ended, to pick the latest of several with one slug. */
function lastDate(c: Campaign) {
  return Math.max(c.onlineClosesAt?.getTime() ?? 0, ...c.deliverySlots.map((s) => s.endsAt.getTime()))
}

/** True once a campaign has any order: its slug and code prefix are then fixed. */
export async function campaignHasOrders(campaignId: string) {
  const snap = await col.orders().where("campaignId", "==", campaignId).limit(1).get()
  return !snap.empty
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const snap = await col.campaigns().doc(id).get()
  return snap.exists ? campaignFromDoc(snap) : null
}

/** A campaign's products, after settling its overdue holds so the stock shown is what is left. */
export async function listProducts(
  campaignId: string,
  { includeInactive = false, now = new Date() } = {}
): Promise<Product[]> {
  await settleOverdueHolds(now, { campaignId })
  const snap = await col.products().where("campaignId", "==", campaignId).get()
  return snap.docs
    .map(productFromDoc)
    .filter((p) => includeInactive || p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

/** A campaign's bundles. Their stock is their components', so list the products too. */
export async function listBundles(campaignId: string, { includeInactive = false } = {}): Promise<Bundle[]> {
  const snap = await col.bundles().where("campaignId", "==", campaignId).get()
  return snap.docs
    .map(bundleFromDoc)
    .filter((b) => includeInactive || b.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function getBundle(id: string): Promise<Bundle | null> {
  const snap = await col.bundles().doc(id).get()
  return snap.exists ? bundleFromDoc(snap) : null
}

/** The buyer's view. Expires the order first if its deadline has passed. */
export async function getOrderByToken(token: string, now = new Date()): Promise<Order | null> {
  if (!isToken(token)) return null
  const snap = await col.orders().where("token", "==", token).limit(1).get()
  const doc = snap.docs[0]
  return doc ? settled(orderFromDoc(doc), now) : null
}

/** Expires the order first if its deadline has passed. */
export async function getOrder(id: string, now = new Date()): Promise<Order | null> {
  const snap = await col.orders().doc(id).get()
  return snap.exists ? settled(orderFromDoc(snap), now) : null
}

async function settled(order: Order, now: Date) {
  return isPastDeadline(order, now) ? expireOrder(order.id, now) : order
}

/**
 * The order behind a typed or scanned code: "GC-7K3P", "gc 7k3p", or a bare
 * "7K3P", which is looked up under every campaign's prefix.
 */
export async function findOrderByCode(input: string): Promise<Order | null> {
  const cleaned = cleanOrderCode(input)
  if (!cleaned) return null
  const prefixes = [...new Set((await listCampaigns()).map((c) => c.codePrefix))]
  const candidates = orderCodeCandidates(cleaned, prefixes)
  if (candidates.length === 0) return null
  const snaps = await db().getAll(...candidates.map((code) => col.orderCodes().doc(code)))
  const orderId = snaps.find((s) => s.exists)?.get("orderId") as string | undefined
  return orderId ? getOrder(orderId) : null
}

/**
 * Orders newest first, of one campaign or of all, after settling overdue
 * holds. A sale is a few hundred orders, so the dashboard loads them all and
 * filters and searches in memory.
 */
export async function listOrders(campaignId?: string, { limit = 3000, now = new Date() } = {}): Promise<Order[]> {
  await settleOverdueHolds(now, { campaignId })
  const scoped = campaignId ? col.orders().where("campaignId", "==", campaignId) : col.orders()
  const snap = await scoped.orderBy("createdAt", "desc").limit(limit).get()
  return snap.docs.map(orderFromDoc)
}

function awaitingQuery(campaignId?: string) {
  const awaiting = col.orders().where("status", "==", "awaiting_verification")
  return campaignId ? awaiting.where("campaignId", "==", campaignId) : awaiting
}

/** Proofs waiting for Danus, of one campaign or of all, oldest first: first come, first checked. */
export async function listAwaitingVerification(campaignId?: string): Promise<Order[]> {
  const snap = await awaitingQuery(campaignId).get()
  return snap.docs
    .map(orderFromDoc)
    .sort(
      (a, b) =>
        (a.payment.submittedAt?.getTime() ?? 0) - (b.payment.submittedAt?.getTime() ?? 0)
    )
}

/** The order a checkout attempt created, if it got that far. */
export async function findOrderByCheckout(checkoutId: string): Promise<Order | null> {
  if (!CHECKOUT_ID_PATTERN.test(checkoutId)) return null
  const snap = await col.checkouts().doc(checkoutId).get()
  const orderId = snap.get("orderId") as string | undefined
  return orderId ? getOrder(orderId) : null
}

/** An account's online orders, newest first, with overdue ones expired. A buyer has a handful. */
export async function listBuyerOrders(uid: string, now = new Date()): Promise<Order[]> {
  if (!uid) return []
  const snap = await col.orders().where("buyerUid", "==", uid).orderBy("createdAt", "desc").limit(200).get()
  return Promise.all(snap.docs.map((doc) => settled(orderFromDoc(doc), now)))
}

/** Paid delivery orders not yet delivered, of every campaign, by slot time then oldest first: the delivery list. */
export async function listAwaitingDelivery(): Promise<Order[]> {
  const snap = await col.orders().where("status", "==", "paid").get()
  return snap.docs
    .map(orderFromDoc)
    .filter(awaitsDelivery)
    .sort(
      (a, b) =>
        a.delivery!.slot.startsAt.getTime() - b.delivery!.slot.startsAt.getTime() ||
        a.createdAt.getTime() - b.createdAt.getTime()
    )
}

/** Places taken in each of a campaign's delivery slots, for checkout. */
export async function slotPlaces(campaign: Campaign, now = new Date()): Promise<Map<string, number>> {
  const places = new Map<string, number>()
  if (!campaign.offers.delivery) return places
  await Promise.all(
    campaign.deliverySlots.map(async (slot) => {
      const snap = await col.orders().where("slotKey", "==", slotKeyOf(campaign.id, slot.id)).get()
      places.set(slot.id, slotPlacesTaken(snap.docs.map(orderFromDoc), slot.id, now))
    })
  )
  return places
}

function slotKeyOf(campaignId: string, slotId: string) {
  return `${campaignId}/${slotId}`
}

/** How many proofs wait for Danus, in every campaign unless one is given: the dashboard badge. */
export async function countAwaitingVerification(campaignId?: string): Promise<number> {
  const snap = await awaitingQuery(campaignId).count().get()
  return snap.data().count
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await col.products().doc(id).get()
  return snap.exists ? productFromDoc(snap) : null
}

/* -------------------------------------------------------------------------
   Buyer actions
   ------------------------------------------------------------------------- */

/** A buyer account's profile, or null when it has none yet. The PPITSZ account's own (accounts/{uid}). */
export const getBuyerProfile = getProfile

/** Stores the profile's fields (already checked with cleanProfile), keeping when it was made. */
export const saveBuyerProfile = saveProfile

/** Makes an empty profile for an account that has none (a staff account buying), keeping the email current. */
export const ensureBuyerProfile = ensureProfile

/** How an online order reaches the buyer: delivered to an address in a slot, or collected. */
export type FulfillmentChoice = { type: "pickup" } | { type: "delivery"; address: string; slotId: string }

/**
 * Creates an online order. With a `checkoutId`, repeating the call (a double tap,
 * or a retry after the page reloaded mid-submit) returns the order the first
 * call made instead of creating a second one.
 *
 * The buyer must be signed in: `buyer` is copied from their account, uid
 * included. Every unpaid order holds stock for the payment window, so one
 * account (and one device, when `deviceKey` is given) may hold only a few at a time.
 * A delivery order also takes a place in its slot, counted in the transaction.
 * Overdue holds never make it fail: they are settled in the same transaction.
 */
export async function createOnlineOrder(
  input: {
    campaignId: string
    buyer: Buyer
    lines: CartLine[]
    /** Pickup when left out. */
    fulfillment?: FulfillmentChoice
    checkoutId?: string
    deviceKey?: string
  },
  now = new Date()
): Promise<Order> {
  if (!input.buyer.uid) throw new ShopError("SIGN_IN_REQUIRED")
  const lines = parseCart(input.lines)
  const checkoutRef = checkoutRefOf(input.checkoutId)
  if (checkoutRef) {
    const existing = await findOrderByCheckout(checkoutRef.id)
    if (existing) return existing
  }

  const campaign = await getCampaign(input.campaignId)
  if (!campaign) throw new ShopError("PRODUCT_UNAVAILABLE")
  const window = onlineWindowState(campaign, now)
  if (window === "not_open") throw new ShopError("ORDERING_NOT_OPEN")
  if (window === "closed") throw new ShopError("ORDERING_CLOSED")
  const fulfillment = input.fulfillment ?? { type: "pickup" }
  assertFulfillment(campaign, fulfillment.type)
  const address = fulfillment.type === "delivery" ? deliveryDetails(fulfillment.address, input.buyer.phone) : ""

  return db().runTransaction(async (tx) => {
    // Checked again inside the transaction: two parallel submits of the same
    // checkout both pass the check above, but only one can commit.
    const existing = await orderOfCheckout(tx, checkoutRef)
    if (existing) return existing

    await assertUnpaidLimit(tx, campaign.id, input.buyer.uid, input.deviceKey, now)
    let delivery: Order["delivery"]
    if (fulfillment.type === "delivery") {
      const inSlot = await tx.get(col.orders().where("slotKey", "==", slotKeyOf(campaign.id, fulfillment.slotId)))
      const taken = slotPlacesTaken(inSlot.docs.map(orderFromDoc), fulfillment.slotId, now)
      delivery = { address, slot: pickSlot(campaign, fulfillment.slotId, taken, now), feeFen: campaign.deliveryFeeFen }
    }
    const { priced, write } = await takeStock(tx, campaign.id, lines, "online", now, campaign.offers.booth)
    const order = await insertOrder(tx, checkoutRef, campaign.codePrefix, now, {
      campaignId: campaign.id,
      channel: "online",
      buyer: input.buyer,
      items: priced.items,
      totalFen: priced.totalFen + (delivery?.feeFen ?? 0),
      delivery,
      status: "pending_payment",
      payment: {},
      rejections: [],
      createdAt: now,
      expiresAt: paymentDeadline(campaign, now),
      pickedUpAt: null,
      handledBy: null,
      deviceKey: input.deviceKey,
    })
    write()
    return order
  })
}

/**
 * Stores the buyer's transfer screenshot and puts the order in Danus's
 * verification queue. Allowed again after a rejection. The file is removed
 * again if the order can't take it.
 */
export async function submitPaymentProof(
  input: {
    token: string
    file: { bytes: Uint8Array; contentType: string }
    accountId: string | undefined
  },
  now = new Date()
): Promise<Order> {
  assertProofFile(input.file)

  const order = await getOrderByToken(input.token, now)
  if (!order) throw new ShopError("NOT_FOUND")
  const campaign = await getCampaign(order.campaignId)
  if (!campaign) throw new ShopError("NOT_FOUND")
  // Refuse before uploading anything; the transaction checks again.
  const refused = refusal(order, "submit_proof", "buyer", now)
  if (refused) throw new ShopError(refused)
  proofAccount(campaign, input.accountId)

  const proofPath = await uploadProof(order.id, input.file, now)
  try {
    const command = { type: "submit_proof", campaign, accountId: input.accountId, proofPath } as const
    return (await runCommand(order.id, command, "buyer", now)).order
  } catch (error) {
    await deleteMediaQuietly(proofPath)
    throw error
  }
}

/* -------------------------------------------------------------------------
   Danus actions. `staff` is the signed-in staff member; the lifecycle
   decides what their role allows.
   ------------------------------------------------------------------------- */

export async function approvePayment(orderId: string, staff: StaffActor, now = new Date()) {
  return (await runCommand(orderId, { type: "approve" }, staff, now)).order
}

/** Sends the order back to the buyer with a reason and a fresh deadline. */
export async function rejectPayment(orderId: string, staff: StaffActor, reason: string, now = new Date()) {
  const order = await getOrder(orderId, now)
  if (!order) throw new ShopError("NOT_FOUND")
  const campaign = await getCampaign(order.campaignId)
  if (!campaign) throw new ShopError("NOT_FOUND")
  return (await runCommand(orderId, { type: "reject", campaign, reason }, staff, now)).order
}

/**
 * The scan at the booth: hands over the items at `indexes`, or every
 * remaining item. `handedOver` says which items this call handed over, even
 * when another phone handed over others meanwhile.
 */
export async function redeemOrder(
  orderId: string,
  staff: StaffActor,
  indexes?: number[],
  now = new Date()
): Promise<Pick<Transition, "order" | "handedOver">> {
  return runCommand(orderId, { type: "hand_over", indexes }, staff, now)
}

/** A delivery order handed to a courier, with its tracking number. Saying it again corrects a typo. */
export async function sendByCourier(
  orderId: string,
  staff: StaffActor,
  courier: { courier: string; trackingNumber: string },
  now = new Date()
) {
  return (await runCommand(orderId, { type: "send_by_courier", ...courier }, staff, now)).order
}

/**
 * A sale at the booth: stock is taken from what is left after online orders.
 * With a `saleId`, a repeated call (a double tap, a retry on a bad
 * connection) returns the first sale instead of selling twice.
 */
export async function createWalkInSale(
  input: {
    campaignId: string
    lines: CartLine[]
    method: PaymentMethod
    accountId?: string
    saleId?: string
  },
  staff: StaffActor,
  now = new Date()
): Promise<Order> {
  const lines = parseCart(input.lines)
  const saleRef = checkoutRefOf(input.saleId)
  return db().runTransaction(async (tx) => {
    const existing = await orderOfCheckout(tx, saleRef)
    if (existing) return existing

    const campaignSnap = await tx.get(col.campaigns().doc(input.campaignId))
    if (!campaignSnap.exists) throw new ShopError("PRODUCT_UNAVAILABLE")
    const campaign = campaignFromDoc(campaignSnap)
    if (campaign.status !== "open") throw new ShopError("CAMPAIGN_CLOSED")
    if (!campaign.offers.booth) throw new ShopError("NO_BOOTH")
    const account = saleAccount(campaign, input.method, input.accountId)
    const { priced, write } = await takeStock(tx, input.campaignId, lines, "walkin", now)
    const order = await insertOrder(tx, saleRef, campaign.codePrefix, now, {
      campaignId: input.campaignId,
      channel: "walkin",
      buyer: null,
      items: priced.items,
      totalFen: priced.totalFen,
      status: "picked_up",
      payment: {
        method: input.method,
        accountId: account?.id,
        verifiedAt: now,
        verifiedBy: staff.uid,
      },
      rejections: [],
      createdAt: now,
      expiresAt: null,
      pickedUpAt: now,
      handledBy: staff.uid,
    })
    write()
    return order
  })
}

/**
 * Cancels an open order or undoes a walk-in sale, and returns the units not
 * yet handed over. The money goes back outside the app and is recorded with
 * recordRefund. handledBy stays: it still says who handed over any items
 * before the cancel.
 */
export async function cancelOrder(orderId: string, staff: StaffActor, reason: string, now = new Date()) {
  return (await runCommand(orderId, { type: "cancel", reason }, staff, now)).order
}

/** Records the money Danus sent back for a canceled or expired online order. Once per order. */
export async function recordRefund(
  orderId: string,
  staff: StaffActor,
  refund: { amountFen: number; method: PaymentMethod; note: string },
  now = new Date()
) {
  return (await runCommand(orderId, { type: "record_refund", ...refund }, staff, now)).order
}

/* -------------------------------------------------------------------------
   Products and campaign settings (admin)
   ------------------------------------------------------------------------- */

/**
 * Creates (no `productId`) or updates a product. The stock counters are read
 * inside the transaction, so a save never undoes an order placed meanwhile.
 * `image` is the photo, `sizeChart` the size chart.
 */
export async function saveProduct(input: {
  campaignId: string
  productId?: string
  edit: ProductEdit
  image?: ImageChange
  sizeChart?: ImageChange
}): Promise<Product> {
  const ref = input.productId ? col.products().doc(input.productId) : col.products().doc()
  const [photo, chart] = await uploadChanges([
    [`products/${ref.id}`, input.image],
    [`products/${ref.id}-size-chart`, input.sizeChart],
  ])

  let previous: (string | undefined)[] = []
  try {
    const saved = await db().runTransaction(async (tx) => {
      let current: Product | null = null
      if (input.productId) {
        const snap = await tx.get(ref)
        if (!snap.exists) throw new ShopError("PRODUCT_UNAVAILABLE")
        current = productFromDoc(snap)
        if (current.campaignId !== input.campaignId) throw new ShopError("PRODUCT_UNAVAILABLE")
      }
      previous = [current?.imagePath, current?.sizeChartPath]
      const product = applyProductEdit(current, input.edit, {
        id: ref.id,
        campaignId: input.campaignId,
        imagePath: chosenPath(input.image, photo, current?.imagePath),
        sizeChartPath: chosenPath(input.sizeChart, chart, current?.sizeChartPath),
      })
      tx.set(ref, productToDoc(product))
      return product
    })
    await deleteUnused(previous, [saved.imagePath, saved.sizeChartPath])
    return saved
  } catch (error) {
    await deleteUnused([photo, chart], [])
    throw error
  }
}

/** Deletes a product of `campaignId` that nobody has ordered or bought yet and no bundle contains. */
export async function deleteProduct(campaignId: string, productId: string) {
  const ref = col.products().doc(productId)
  const removed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ShopError("PRODUCT_UNAVAILABLE")
    const product = productFromDoc(snap)
    if (product.campaignId !== campaignId) throw new ShopError("PRODUCT_UNAVAILABLE")
    if (!isUnsold(product)) throw new ShopError("PRODUCT_IN_USE")
    // Read in the transaction, so a bundle saved meanwhile can't end up naming a deleted product.
    const bundles = (await tx.get(col.bundles().where("campaignId", "==", campaignId))).docs.map(bundleFromDoc)
    if (bundles.some((b) => b.components.some((c) => c.productId === productId))) {
      throw new ShopError("PRODUCT_IN_BUNDLE")
    }
    tx.delete(ref)
    return product
  })
  await deleteUnused([removed.imagePath, removed.sizeChartPath], [])
}

/**
 * Creates (no `bundleId`) or updates a bundle. Its components must be
 * products of the same campaign, checked inside the transaction.
 */
export async function saveBundle(input: {
  campaignId: string
  bundleId?: string
  edit: BundleEdit
  image?: ImageChange
}): Promise<Bundle> {
  const ref = input.bundleId ? col.bundles().doc(input.bundleId) : col.bundles().doc()
  const [photo] = await uploadChanges([[`bundles/${ref.id}`, input.image]])

  let previous: string | undefined
  try {
    const saved = await db().runTransaction(async (tx) => {
      let current: Bundle | null = null
      if (input.bundleId) {
        const snap = await tx.get(ref)
        if (!snap.exists) throw new ShopError("PRODUCT_UNAVAILABLE")
        current = bundleFromDoc(snap)
        if (current.campaignId !== input.campaignId) throw new ShopError("PRODUCT_UNAVAILABLE")
      }
      previous = current?.imagePath
      const products = await tx.get(col.products().where("campaignId", "==", input.campaignId))
      const bundle = applyBundleEdit(
        input.edit,
        { id: ref.id, campaignId: input.campaignId, imagePath: chosenPath(input.image, photo, current?.imagePath) },
        new Set(products.docs.map((d) => d.id))
      )
      tx.set(ref, bundleToDoc(bundle))
      return bundle
    })
    await deleteUnused([previous], [saved.imagePath])
    return saved
  } catch (error) {
    await deleteUnused([photo], [])
    throw error
  }
}

/** Deletes a bundle. Always allowed: orders keep a copy of what their bundles held. */
export async function deleteBundle(campaignId: string, bundleId: string) {
  const ref = col.bundles().doc(bundleId)
  const removed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ShopError("PRODUCT_UNAVAILABLE")
    const bundle = bundleFromDoc(snap)
    if (bundle.campaignId !== campaignId) throw new ShopError("PRODUCT_UNAVAILABLE")
    tx.delete(ref)
    return bundle
  })
  await deleteUnused([removed.imagePath], [])
}

export interface CampaignSave extends CampaignEdit {
  accounts: (Omit<PaymentAccount, "qrImagePath"> & { removeQr?: boolean; qrImage?: ImageFile })[]
  cover?: ImageChange
  /** For a new campaign: start with this campaign's payment accounts, QR images copied. */
  copyAccountsFrom?: string
}

/**
 * Updates a campaign, or creates one when `campaignId` is null. The rules
 * (checkCampaignEdit) run in the transaction against every other campaign,
 * so two saves can't take the same slug or prefix. New images are stored
 * first; images no longer used are deleted after the save.
 */
export async function saveCampaign(campaignId: string | null, input: CampaignSave): Promise<Campaign> {
  const id = campaignId ?? newCampaignId(input.slug)
  const uploads = new Map<string, string>()
  let accounts = input.accounts
  let cover: string | undefined
  try {
    if (!campaignId && input.copyAccountsFrom) {
      const source = await getCampaign(input.copyAccountsFrom)
      const copied: Omit<PaymentAccount, "qrImagePath">[] = []
      for (const { qrImagePath, ...account } of source?.paymentAccounts ?? []) {
        if (qrImagePath) uploads.set(account.id, await copyImage(qrImagePath, `payment-accounts/${id}/${account.id}`))
        copied.push(account)
      }
      accounts = [...copied, ...accounts.filter((a) => !copied.some((c) => c.id === a.id))]
    }
    for (const account of accounts) {
      if (account.qrImage) {
        uploads.set(account.id, await uploadImage(`payment-accounts/${id}/${account.id}`, account.qrImage))
      }
    }
    ;[cover] = await uploadChanges([[`campaigns/${id}-cover`, input.cover]])
  } catch (error) {
    await deleteUnused([...uploads.values(), cover], [])
    throw error
  }

  const ref = col.campaigns().doc(id)
  let before: Campaign | null = null
  try {
    const saved = await db().runTransaction(async (tx) => {
      const [snap, all] = await Promise.all([tx.get(ref), tx.get(col.campaigns())])
      if (campaignId && !snap.exists) throw new ShopError("NOT_FOUND")
      before = snap.exists ? campaignFromDoc(snap) : null
      const hasOrders = before
        ? !(await tx.get(col.orders().where("campaignId", "==", id).limit(1))).empty
        : false
      const others = all.docs.filter((d) => d.id !== id).map(campaignFromDoc)
      const issue = checkCampaignEdit(input, { current: before, others, hasOrders })[0]
      if (issue) throw new ShopError("INVALID_CAMPAIGN", issue.message)
      if (input.featuredProductId) {
        const featured = await tx.get(col.products().doc(input.featuredProductId))
        if (featured.get("campaignId") !== id) throw new ShopError("INVALID_FEATURED")
      }

      const campaign: Campaign = {
        id,
        name: input.name.trim(),
        slug: input.slug,
        codePrefix: input.codePrefix,
        tagline: input.tagline.trim(),
        coverImagePath: chosenPath(input.cover, cover, before?.coverImagePath),
        featuredProductId: input.featuredProductId ?? undefined,
        sortOrder: input.sortOrder,
        status: input.status,
        pickupInfo: input.pickupInfo.trim(),
        onlineOpensAt: input.onlineOpensAt,
        onlineClosesAt: input.onlineClosesAt,
        offers: input.offers,
        deliveryFeeFen: input.offers.delivery ? input.deliveryFeeFen : 0,
        deliverySlots: input.offers.delivery ? bySlotTime(input.deliverySlots) : [],
        paymentWindowMinutes: input.paymentWindowMinutes,
        paymentAccounts: mergePaymentAccounts(
          before?.paymentAccounts ?? [],
          accounts.map(({ qrImage: _file, ...a }) => ({ ...a, newQrPath: uploads.get(a.id) }))
        ),
      }
      tx.set(ref, campaignToDoc(campaign))
      return campaign
    })
    const previous = before as Campaign | null
    await deleteUnused(
      [...(previous?.paymentAccounts.map((a) => a.qrImagePath) ?? []), previous?.coverImagePath],
      [...saved.paymentAccounts.map((a) => a.qrImagePath), saved.coverImagePath]
    )
    return saved
  } catch (error) {
    await deleteUnused([...uploads.values(), cover], [])
    throw error
  }
}

function newCampaignId(slug: string) {
  return `${slug || "campaign"}-${Buffer.from(crypto.getRandomValues(new Uint8Array(3))).toString("hex")}`
}

/* -------------------------------------------------------------------------
   Settling overdue holds (see the top of this file for when it runs)
   ------------------------------------------------------------------------- */

/** How many overdue orders one query or one stock-taking transaction settles. */
const SETTLE_BATCH = 20
/** A sweep stops after this many batches; the next read carries on. */
const SETTLE_MAX_BATCHES = 10

/** Expires one order if it is still unpaid past its deadline. */
async function expireOrder(orderId: string, now: Date): Promise<Order> {
  return db().runTransaction(async (tx) => {
    const order = await readOrder(tx, orderId)
    if (!isPastDeadline(order, now)) return order
    const transition = applyCommand(order, { type: "expire" }, "system", now)
    const products = await readProductsById(tx, productIdsOf(transition.released))
    writeTransition(tx, transition, releaseItems(transition.released, order.channel, products))
    return transition.order
  })
}

/**
 * Expires every overdue order, of one campaign or of all. Returns how many
 * were expired. Nothing to do costs one query.
 */
export async function settleOverdueHolds(now = new Date(), { campaignId }: { campaignId?: string } = {}) {
  let expired = 0
  for (let batch = 0; batch < SETTLE_MAX_BATCHES; batch++) {
    const snap = await overdueQuery(campaignId, now).limit(SETTLE_BATCH).get()
    for (const doc of snap.docs) {
      if ((await expireOrder(doc.id, now)).status === "expired") expired++
    }
    if (snap.size < SETTLE_BATCH) break
  }
  return expired
}

function overdueQuery(campaignId: string | undefined, now: Date) {
  const unpaid = col.orders().where("status", "==", "pending_payment")
  return (campaignId ? unpaid.where("campaignId", "==", campaignId) : unpaid).where(
    "expiresAt",
    "<=",
    Timestamp.fromDate(now)
  )
}

/**
 * Prices `lines` and takes their units on `channel`, after settling the
 * campaign's overdue holds in the same transaction, so they never block a
 * sale. `capped` is false for a campaign without a booth. Only reads: call
 * `write` after the transaction's other reads.
 */
async function takeStock(
  tx: Transaction,
  campaignId: string,
  lines: CartLine[],
  channel: Channel,
  now: Date,
  capped = true
) {
  const overdue = (await tx.get(overdueQuery(campaignId, now).limit(SETTLE_BATCH))).docs.map(orderFromDoc)
  const bundles = await readBundlesById(
    tx,
    lines.flatMap((l) => (isBundleLine(l) ? [l.bundleId] : []))
  )
  const products = await readProductsById(tx, [
    ...lines.flatMap((l) =>
      isBundleLine(l) ? (bundles.get(l.bundleId)?.components.map((c) => c.productId) ?? []) : [l.productId]
    ),
    ...productIdsOf(overdue.flatMap((o) => o.items)),
  ])

  const changed = new Set<string>()
  const keep = (updated: Product[]) => {
    for (const product of updated) {
      products.set(product.id, product)
      changed.add(product.id)
    }
  }
  const expired = overdue.map((order) => {
    const transition = applyCommand(order, { type: "expire" }, "system", now)
    keep(releaseItems(transition.released, order.channel, products))
    return transition.order
  })
  const priced = priceAndReserve(lines, products, bundles, channel, campaignId, { capped, now })
  keep(priced.updatedProducts)

  return {
    priced,
    write() {
      for (const order of expired) tx.set(col.orders().doc(order.id), orderToDoc(order))
      writeProducts(tx, [...changed].map((id) => products.get(id)!))
    },
  }
}

/* -------------------------------------------------------------------------
   Transaction helpers
   ------------------------------------------------------------------------- */

async function readOrder(tx: Transaction, orderId: string) {
  const snap = await tx.get(col.orders().doc(orderId))
  if (!snap.exists) throw new ShopError("NOT_FOUND")
  return orderFromDoc(snap)
}

/** Where a checkout attempt or kasir sale records its order; null for a missing or malformed id. */
function checkoutRefOf(id: string | undefined) {
  return id && CHECKOUT_ID_PATTERN.test(id) ? col.checkouts().doc(id) : null
}

/** The order this checkout attempt or sale already made, if any. */
async function orderOfCheckout(tx: Transaction, ref: DocumentReference | null) {
  if (!ref) return null
  const orderId = (await tx.get(ref)).get("orderId") as string | undefined
  return orderId ? readOrder(tx, orderId) : null
}

/**
 * Creates a new order with a fresh code (under the campaign's prefix) and token, and records it under
 * `checkoutRef` when given. Claiming the code reads, so call this after the
 * transaction's other reads and before its other writes.
 */
async function insertOrder(
  tx: Transaction,
  checkoutRef: DocumentReference | null,
  codePrefix: string,
  now: Date,
  fields: Omit<Order, "id" | "code" | "token">
): Promise<Order> {
  const code = await claimCode(tx, codePrefix)
  const ref = col.orders().doc()
  const order: Order = { id: ref.id, code, token: generateToken(), ...fields }
  tx.create(col.orderCodes().doc(code), { orderId: ref.id })
  if (checkoutRef) tx.create(checkoutRef, { orderId: ref.id, createdAt: Timestamp.fromDate(now) })
  tx.create(ref, orderToDoc(order))
  return order
}

/**
 * Runs a lifecycle command in a transaction and writes what it returns,
 * releasing stock when it says so. An order found past its deadline is
 * expired instead, and the command refused with ORDER_EXPIRED.
 */
async function runCommand(orderId: string, command: OrderCommand, actor: Actor, now: Date): Promise<Transition> {
  const { transition, overdue } = await db().runTransaction(async (tx) => {
    const order = await readOrder(tx, orderId)
    const overdue = command.type !== "expire" && isPastDeadline(order, now)
    const transition = overdue
      ? applyCommand(order, { type: "expire" }, "system", now)
      : applyCommand(order, command, actor, now)
    const products = await readProductsById(tx, productIdsOf(transition.released))
    writeTransition(tx, transition, releaseItems(transition.released, order.channel, products))
    return { transition, overdue }
  })
  if (overdue) throw new ShopError("ORDER_EXPIRED")
  return transition
}

function writeTransition(tx: Transaction, transition: Transition, releasedProducts: Product[]) {
  writeProducts(tx, releasedProducts)
  tx.set(col.orders().doc(transition.order.id), orderToDoc(transition.order))
}

async function readProductsById(tx: Transaction, ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map<string, Product>()
  const snaps = await tx.getAll(...unique.map((id) => col.products().doc(id)))
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, productFromDoc(s)]))
}

async function readBundlesById(tx: Transaction, ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map<string, Bundle>()
  const snaps = await tx.getAll(...unique.map((id) => col.bundles().doc(id)))
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, bundleFromDoc(s)]))
}

/** The products whose stock `items` hold, including what their bundles hold. */
function productIdsOf(items: OrderItem[]) {
  return stockUnits(items).map((u) => u.productId)
}

function writeProducts(tx: Transaction, products: Product[]) {
  for (const product of products) {
    tx.update(col.products().doc(product.id), { variants: productToDoc(product).variants })
  }
}

/** Throws TOO_MANY_UNPAID when this account or device already holds enough unpaid orders. */
async function assertUnpaidLimit(
  tx: Transaction,
  campaignId: string,
  buyerUid: string,
  deviceKey: string | undefined,
  now: Date
) {
  const unpaidBy = async (field: string, value: string) => {
    const snap = await tx.get(
      col.orders().where(field, "==", value).where("status", "==", "pending_payment")
    )
    return countUnpaid(snap.docs.map(orderFromDoc), campaignId, now)
  }
  if ((await unpaidBy("buyerUid", buyerUid)) >= MAX_UNPAID_PER_BUYER) {
    throw new ShopError("TOO_MANY_UNPAID")
  }
  if (deviceKey && (await unpaidBy("deviceKey", deviceKey)) >= MAX_UNPAID_PER_DEVICE) {
    throw new ShopError("TOO_MANY_UNPAID")
  }
}

/** Picks an unused order code. Reads happen before any write, as Firestore requires. */
async function claimCode(tx: Transaction, prefix: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateOrderCode(prefix)
    const snap = await tx.get(col.orderCodes().doc(code))
    if (!snap.exists) return code
  }
  throw new Error("Could not find a free order code")
}
