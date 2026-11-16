/*
 * Integration tests against the Firebase emulators, on their own ports
 * (firebase.test.json) so they never wipe your dev data. Run with
 * `bun run test:emulator`, which starts the emulators and stops them after.
 */
import { beforeEach, describe, expect, test } from "bun:test"

import { ShopError } from "../domain/errors"
import type { ProductEdit } from "../domain/product"
import type { Buyer, Product } from "../domain/types"
import { bucket, db } from "../firebase/admin"
import {
  approvePayment,
  cancelOrder,
  createOnlineOrder,
  createWalkInSale,
  deleteBundle,
  getBundle,
  listBundles,
  saveBundle,
  settleOverdueHolds,
  findOrderByCheckout,
  deleteProduct,
  findOrderByCode,
  getCampaign,
  getCampaignBySlug,
  listCampaigns,
  countAwaitingVerification,
  ensureBuyerProfile,
  getBuyerProfile,
  getOrderByToken,
  listBuyerOrders,
  saveBuyerProfile,
  getProduct,
  listAwaitingDelivery,
  listAwaitingVerification,
  listOrders,
  listProducts,
  readMedia,
  recordRefund,
  redeemOrder,
  rejectPayment,
  saveCampaign,
  saveProduct,
  sendByCourier,
  slotPlaces,
  ordersByTransactionDigits,
  submitPaymentProof,
  countTestOrders,
  deleteTestOrders,
  campaignHasOrders,
} from "./index"
import { allowRequest } from "./rate-limit"
import type { CampaignSave } from "./index"
import {
  writeSamples,
  SAMPLE_CAMPAIGN_ID,
  SAMPLE_MERCH_ID,
  sampleBundles,
  sampleCampaign,
  sampleMerchCampaign,
  sampleProducts,
} from "./test-data"
import type { Bundle, Campaign } from "../domain/types"

const PROJECT = "demo-ppitsz"
const buyer: Buyer = {
  uid: "u-budi",
  email: "budi@test.test",
  name: "Budi",
  wechatId: "budi_sz",
  phone: "+86 138 0000 0000",
}
/** Another account; the unpaid-orders limit counts per account. */
const buyerAs = (uid: string, patch: Partial<Buyer> = {}): Buyer => ({
  ...buyer,
  uid,
  email: `${uid}@test.test`,
  wechatId: uid,
  ...patch,
})
const NOW = new Date("2027-03-05T12:00:00+08:00")
const png = { bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3]), contentType: "image/png" }
/** The last 6 digits of a WeChat Pay transaction number. */
const TXN = "567890"
const admin = { uid: "admin-1", role: "admin" as const }
const booth = (uid: string) => ({ uid, role: "booth" as const })

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Run these tests with `bun run test:emulator`.")
}

async function clearFirestore() {
  const res = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(`Could not clear the emulator: ${res.status}`)
}

async function variantOf(productId: string, variantId = "default") {
  const products = await listProducts(SAMPLE_CAMPAIGN_ID, { includeInactive: true })
  return products.find((p) => p.id === productId)!.variants.find((v) => v.id === variantId)!
}

async function expectCode(promise: Promise<unknown>, code: ShopError["code"]) {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ShopError)
    expect((error as ShopError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}, but nothing was thrown`)
}

const OPENED = new Date("2027-03-03T00:00:00+08:00")

/** One campaign holding every sample product, food and merch together, as any campaign may. */
function seedOne({
  campaign = sampleCampaign(OPENED),
  products,
  bundles,
}: { campaign?: Campaign; products?: Product[]; bundles?: Bundle[] } = {}) {
  return writeSamples({
    campaigns: [campaign],
    products: products ?? sampleProducts(campaign.id),
    bundles: bundles ?? sampleBundles(campaign.id),
  })
}
const otherCampaign = () => ({ ...sampleCampaign(OPENED), id: "other", slug: "other", codePrefix: "OT" })

beforeEach(async () => {
  await clearFirestore()
  await seedOne()
})

// A different buyer each time, so the unpaid-orders limit stays out of the way.
let buyers = 0
const order = (
  lines: { productId: string; variantId?: string; qty: number }[],
  now = NOW,
  who: Buyer = buyerAs(`buyer_${++buyers}`)
) =>
  createOnlineOrder(
    {
      campaignId: SAMPLE_CAMPAIGN_ID,
      buyer: who,
      lines: lines.map((l) => ({ variantId: "default", ...l })),
    },
    now
  )

describe("online orders", () => {
  test("reserve stock and wait for payment", async () => {
    const created = await order([{ productId: "nasi-kuning", qty: 2 }])
    expect(created.status).toBe("pending_payment")
    expect(created.totalFen).toBe(3000)
    expect(created.code).toMatch(/^GC-/)
    expect(created.expiresAt!.getTime() - NOW.getTime()).toBe(120 * 60_000)
    expect((await variantOf("nasi-kuning")).onlineOrdered).toBe(2)
    expect((await getOrderByToken(created.token, NOW))!.id).toBe(created.id)
    expect((await findOrderByCode(created.code))!.id).toBe(created.id)
  })

  test("parallel buyers can't oversell the last units", async () => {
    // Nasi kuning: online cap 40.
    await order([{ productId: "nasi-kuning", qty: 20 }])
    await order([{ productId: "nasi-kuning", qty: 17 }])
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () => order([{ productId: "nasi-kuning", qty: 1 }]))
    )
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(3)
    expect((await variantOf("nasi-kuning")).onlineOrdered).toBe(40)
  })

  test("repeating a checkout returns the same order, even in parallel", async () => {
    const checkoutId = crypto.randomUUID()
    const submit = () =>
      createOnlineOrder(
        { campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [{ productId: "risoles", variantId: "default", qty: 2 }], checkoutId },
        NOW
      )
    const [a, b] = await Promise.all([submit(), submit()])
    const c = await submit()
    expect(a.id).toBe(b.id)
    expect(c.id).toBe(a.id)
    expect((await variantOf("risoles")).onlineOrdered).toBe(2)
    expect((await findOrderByCheckout(checkoutId))!.id).toBe(a.id)
    expect(await findOrderByCheckout(crypto.randomUUID())).toBeNull()
  })

  test("an order needs an account, and lists under it, newest first", async () => {
    await expectCode(order([{ productId: "risoles", qty: 1 }], NOW, { ...buyer, uid: "" }), "SIGN_IN_REQUIRED")
    const first = await order([{ productId: "risoles", qty: 1 }], NOW, buyer)
    const second = await order([{ productId: "nasi-kuning", qty: 1 }], new Date(NOW.getTime() + 1000), buyer)
    await order([{ productId: "risoles", qty: 1 }])
    const mine = await listBuyerOrders(buyer.uid, NOW)
    expect(mine.map((o) => o.id)).toEqual([second.id, first.id])
    expect(mine[0]!.buyer).toEqual(buyer)
    expect(await listBuyerOrders("")).toEqual([])
  })

  test("an account's list shows an overdue order as expired", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }], NOW, buyer)
    const [listed] = await listBuyerOrders(buyer.uid, new Date(created.expiresAt!.getTime() + 1))
    expect(listed!.status).toBe("expired")
  })

  test("walk-in-only products can't be ordered online", async () => {
    await expectCode(order([{ productId: "es-teh", qty: 1 }]), "SOLD_OUT")
  })

  test("closed after the cutoff", async () => {
    await expectCode(
      order([{ productId: "risoles", qty: 1 }], new Date("2027-03-16T00:00:00+08:00")),
      "ORDERING_CLOSED"
    )
  })

  test("unpaid orders expire and give their stock back", async () => {
    const created = await order([{ productId: "risoles", qty: 3 }])
    const later = new Date(created.expiresAt!.getTime() + 1)
    expect((await getOrderByToken(created.token, later))!.status).toBe("expired")
    expect((await variantOf("risoles")).onlineOrdered).toBe(0)
    await expectCode(submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, later), "ORDER_EXPIRED")
  })

  test("overdue holds never block a new online order or a walk-in sale", async () => {
    // Kaos M: 25 units, no online cap.
    const held = await order([{ productId: "kaos-szcup", variantId: "m", qty: 20 }])
    const later = new Date(held.expiresAt!.getTime() + 1)
    const sale = createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "kaos-szcup", variantId: "m", qty: 15 }], method: "cash" },
      booth("register-1"),
      later
    )
    expect((await sale).status).toBe("picked_up")
    expect((await order([{ productId: "kaos-szcup", variantId: "m", qty: 10 }], later)).status).toBe("pending_payment")
    expect(await variantOf("kaos-szcup", "m")).toMatchObject({ onlineOrdered: 10, walkIn: 15 })
    expect((await getOrderByToken(held.token, later))!.status).toBe("expired")
  })

  test("listing products and orders settles overdue holds first", async () => {
    const held = await order([{ productId: "risoles", qty: 3 }])
    const later = new Date(held.expiresAt!.getTime() + 1)
    const products = await listProducts(SAMPLE_CAMPAIGN_ID, { now: later })
    expect(products.find((p) => p.id === "risoles")!.variants[0]!.onlineOrdered).toBe(0)
    const orders = await listOrders(SAMPLE_CAMPAIGN_ID, { now: later })
    expect(orders.find((o) => o.id === held.id)!.status).toBe("expired")
  })

  test("an overdue order refuses staff commands and is expired by the attempt", async () => {
    const held = await order([{ productId: "risoles", qty: 2 }])
    const later = new Date(held.expiresAt!.getTime() + 1)
    await expectCode(cancelOrder(held.id, admin, "Batal", later), "ORDER_EXPIRED")
    expect((await variantOf("risoles")).onlineOrdered).toBe(0)
  })

  test("the sweep expires overdue orders only", async () => {
    const stale = await order([{ productId: "risoles", qty: 1 }])
    await order([{ productId: "risoles", qty: 1 }], new Date(NOW.getTime() + 60 * 60_000))
    const sweepAt = new Date(stale.expiresAt!.getTime() + 1)
    expect(await settleOverdueHolds(sweepAt)).toBe(1)
    expect((await variantOf("risoles")).onlineOrdered).toBe(1)
  })
})

describe("payment and pickup", () => {
  test("proof → approve → scan → done", async () => {
    const created = await order([{ productId: "nasi-kuning", qty: 1 }, { productId: "gantungan", qty: 2 }])
    await expectCode(redeemOrder(created.id, booth("staff-1"), undefined, NOW), "NOT_PAID")

    const submitted = await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    expect(submitted.status).toBe("awaiting_verification")
    expect(submitted.expiresAt).toBeNull()
    expect(submitted.payment.proofPath).toStartWith(`proofs/${created.id}/`)

    const paid = await approvePayment(created.id, admin, NOW)
    expect(paid.status).toBe("paid")

    const partial = await redeemOrder(created.id, booth("staff-2"), [1], NOW)
    expect(partial.order.status).toBe("paid")
    const done = await redeemOrder(created.id, booth("staff-2"), undefined, NOW)
    expect(done.order.status).toBe("picked_up")
    expect(done.order.handledBy).toBe("staff-2")
    expect(done.handedOver).toEqual([0])
    await expectCode(redeemOrder(created.id, booth("staff-2"), undefined, NOW), "ALREADY_PICKED_UP")
  })

  test("two scanners on the same QR: exactly one hands it over", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await submitPaymentProof({ token: created.token, file: png, accountId: "alipay-1", transactionDigits: TXN }, NOW)
    await approvePayment(created.id, admin, NOW)
    const scans = await Promise.allSettled([
      redeemOrder(created.id, booth("phone-a"), undefined, NOW),
      redeemOrder(created.id, booth("phone-b"), undefined, NOW),
    ])
    expect(scans.filter((s) => s.status === "fulfilled")).toHaveLength(1)
  })

  test("two scanners handing over different items each report their own", async () => {
    const created = await order([{ productId: "nasi-kuning", qty: 1 }, { productId: "gantungan", qty: 2 }])
    await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await approvePayment(created.id, admin, NOW)
    const [food, merch] = await Promise.all([
      redeemOrder(created.id, booth("phone-a"), [0], NOW),
      redeemOrder(created.id, booth("phone-b"), [1], NOW),
    ])
    expect(food.handedOver).toEqual([0])
    expect(merch.handedOver).toEqual([1])
    expect((await getOrderByToken(created.token, NOW))!.status).toBe("picked_up")
  })

  test("booth staff can't verify, whatever page they call it from", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await expectCode(approvePayment(created.id, booth("booth-1"), NOW), "NOT_ALLOWED")
    await expectCode(rejectPayment(created.id, booth("booth-1"), "Buram", NOW), "NOT_ALLOWED")
  })

  test("a proof must name one of the campaign's accounts, and nothing is uploaded otherwise", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await expectCode(submitPaymentProof({ token: created.token, file: png, accountId: "nope" }, NOW), "INVALID_ACCOUNT")
    const [files] = await bucket().getFiles({ prefix: `proofs/${created.id}/` })
    expect(files).toHaveLength(0)
  })

  test("a WeChat Pay proof needs its transaction digits, and nothing is uploaded without one", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await expectCode(
      submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1" }, NOW),
      "INVALID_TRANSACTION_DIGITS"
    )
    const [files] = await bucket().getFiles({ prefix: `proofs/${created.id}/` })
    expect(files).toHaveLength(0)

    const sent = await submitPaymentProof(
      { token: created.token, file: png, accountId: "wechat-1", transactionDigits: "4200 0012 3420 2611 1312 3456 7890" },
      NOW
    )
    expect(sent.payment.transactionDigits).toBe(TXN)
    expect((await getOrderByToken(created.token, NOW))!.payment.transactionDigits).toBe(TXN)
  })

  test("orders are found by the transaction digits on their proof", async () => {
    const a = await order([{ productId: "risoles", qty: 1 }])
    const b = await order([{ productId: "risoles", qty: 1 }])
    const c = await order([{ productId: "risoles", qty: 1 }])
    await submitPaymentProof({ token: a.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await submitPaymentProof({ token: b.token, file: png, accountId: "alipay-1", transactionDigits: TXN }, NOW)
    await submitPaymentProof(
      { token: c.token, file: png, accountId: "wechat-1", transactionDigits: "111111" },
      NOW
    )
    const found = await ordersByTransactionDigits([TXN, TXN, "222222"])
    expect(found.get(TXN)!.map((o) => o.id).sort()).toEqual([a.id, b.id].sort())
    expect(found.has("222222")).toBe(false)
    expect(await ordersByTransactionDigits([])).toEqual(new Map())
  })

  test("two proofs racing: one wins, the loser's file is removed", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    const results = await Promise.allSettled([
      submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW),
      submitPaymentProof({ token: created.token, file: png, accountId: "alipay-1", transactionDigits: TXN }, NOW),
    ])
    const won = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
    expect(won).toHaveLength(1)
    const [files] = await bucket().getFiles({ prefix: `proofs/${created.id}/` })
    expect(files.map((f) => f.name)).toEqual([won[0]!.payment.proofPath!])
  })

  test("a rejected proof goes back to the buyer with a new deadline", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    const later = new Date(NOW.getTime() + 5 * 60 * 60_000)
    const rejected = await rejectPayment(created.id, admin, "Nominal kurang ¥5", later)
    expect(rejected.status).toBe("pending_payment")
    expect(rejected.rejections.map((r) => r.reason)).toEqual(["Nominal kurang ¥5"])
    expect(rejected.expiresAt!.getTime()).toBe(later.getTime() + 120 * 60_000)
    const again = await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, later)
    expect(again.status).toBe("awaiting_verification")
    // The rejected proof stays on record, file and all.
    const stored = (await getOrderByToken(created.token, later))!
    expect(stored.rejections).toHaveLength(1)
    expect(stored.rejections[0]!.at).toEqual(later)
    expect(stored.rejections[0]!.transactionDigits).toBe(TXN)
    expect(await readMedia(stored.rejections[0]!.proofPath!)).not.toBeNull()
    expect(stored.payment.proofPath).not.toBe(stored.rejections[0]!.proofPath)
  })

  test("rejects files that aren't images", async () => {
    const created = await order([{ productId: "risoles", qty: 1 }])
    await expectCode(
      submitPaymentProof({ token: created.token, file: { bytes: new Uint8Array([1]), contentType: "application/pdf" }, accountId: "wechat-1", transactionDigits: TXN }, NOW),
      "INVALID_FILE"
    )
  })
})

describe("dashboard queries", () => {
  test("the verification queue lists proofs oldest first", async () => {
    const a = await order([{ productId: "risoles", qty: 1 }])
    const b = await order([{ productId: "risoles", qty: 1 }])
    await order([{ productId: "risoles", qty: 1 }]) // never pays
    await submitPaymentProof({ token: b.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, new Date(NOW.getTime() + 60_000))
    await submitPaymentProof({ token: a.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, new Date(NOW.getTime() + 120_000))
    expect((await listAwaitingVerification(SAMPLE_CAMPAIGN_ID)).map((o) => o.id)).toEqual([b.id, a.id])
  })

  test("the order list is newest first and per campaign", async () => {
    const older = await order([{ productId: "risoles", qty: 1 }])
    const newer = await order([{ productId: "risoles", qty: 1 }], new Date(NOW.getTime() + 60_000))
    expect((await listOrders(SAMPLE_CAMPAIGN_ID)).map((o) => o.id)).toEqual([newer.id, older.id])
    expect(await listOrders("other")).toEqual([])
  })
})

describe("booth", () => {
  test("walk-ins sell what online orders can't take, and stop at zero", async () => {
    // Es teh: 80 units, all for walk-ins.
    const sale = await createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty: 3 }], method: "cash" },
      booth("register-1"),
      NOW
    )
    expect(sale.status).toBe("picked_up")
    expect(sale.buyer).toBeNull()
    expect((await variantOf("es-teh")).walkIn).toBe(3)
    const sell = (qty: number) =>
      createWalkInSale(
        { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty }], method: "cash" },
        booth("register-1"),
        NOW
      )
    for (let i = 0; i < 3; i++) await sell(20)
    await expectCode(sell(18), "SOLD_OUT")
    expect((await sell(17)).totalFen).toBe(17 * 500)
  })

  test("a typo'd quantity is refused as too many, not as sold out", async () => {
    await expectCode(
      createWalkInSale(
        { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty: 21 }], method: "cash" },
        booth("register-1"),
        NOW
      ),
      "QTY_LIMIT"
    )
  })

  test("a sale to an account of the wrong method is refused", async () => {
    await expectCode(
      createWalkInSale(
        { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty: 1 }], method: "wechat", accountId: "alipay-1" },
        booth("register-1"),
        NOW
      ),
      "INVALID_ACCOUNT"
    )
  })

  test("booth staff undo only their own sale", async () => {
    const sale = await createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty: 1 }], method: "cash" },
      booth("register-1"),
      NOW
    )
    await expectCode(cancelOrder(sale.id, booth("register-2"), "Salah input", NOW), "SALE_LOCKED")
    await expectCode(cancelOrder(sale.id, booth("register-1"), "Salah input", new Date(NOW.getTime() + 31 * 60_000)), "SALE_LOCKED")
    expect((await cancelOrder(sale.id, admin, "Salah input", NOW)).status).toBe("cancelled")
  })

  test("undoing a register mistake returns the stock", async () => {
    const sale = await createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "seblak", variantId: "pedas", qty: 2 }], method: "wechat", accountId: "wechat-1" },
      booth("register-1"),
      NOW
    )
    await cancelOrder(sale.id, booth("register-1"), "Salah input", NOW)
    expect((await variantOf("seblak", "pedas")).walkIn).toBe(0)
  })

  test("canceling a paid online order releases only what wasn't handed over", async () => {
    const created = await order([{ productId: "nasi-kuning", qty: 2 }, { productId: "risoles", qty: 1 }])
    await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await approvePayment(created.id, admin, NOW)
    await redeemOrder(created.id, booth("booth-1"), [0], NOW)
    const cancelled = await cancelOrder(created.id, admin, "Risoles habis, refund ¥10", NOW)
    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.cancelledBy).toBe("admin-1")
    // Who handed over the nasi kuning is still on record.
    expect((await getOrderByToken(created.token, NOW))!.handledBy).toBe("booth-1")
    expect((await variantOf("nasi-kuning")).onlineOrdered).toBe(2)
    expect((await variantOf("risoles")).onlineOrdered).toBe(0)
  })

  test("products from another campaign can't be bought", async () => {
    const other: Product = { ...sampleProducts("other")[0]!, id: "other-food" }
    await seedOne({ campaign: otherCampaign(), products: [other], bundles: [] })
    await seedOne({ products: [] })
    await expectCode(order([{ productId: "other-food", qty: 1 }]), "PRODUCT_UNAVAILABLE")
  })
})

describe("spam limits", () => {
  test("one account holds at most two unpaid orders, whatever WeChat ID it types; paying or expiry frees a slot", async () => {
    const who = buyerAs("spammer")
    const first = await order([{ productId: "risoles", qty: 1 }], NOW, who)
    await order([{ productId: "risoles", qty: 1 }], NOW, { ...who, wechatId: "someone_else" })
    await expectCode(order([{ productId: "risoles", qty: 1 }], NOW, who), "TOO_MANY_UNPAID")

    await submitPaymentProof({ token: first.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    const third = await order([{ productId: "risoles", qty: 1 }], NOW, who)
    await expectCode(order([{ productId: "risoles", qty: 1 }], NOW, who), "TOO_MANY_UNPAID")

    // Past the payment window the held orders no longer count, swept or not.
    const later = new Date(third.expiresAt!.getTime() + 1)
    expect((await order([{ productId: "risoles", qty: 1 }], later, who)).status).toBe("pending_payment")
  })

  test("one device holds at most three unpaid orders, whatever the accounts", async () => {
    const fromDevice = (uid: string) =>
      createOnlineOrder(
        {
          campaignId: SAMPLE_CAMPAIGN_ID,
          buyer: buyerAs(uid),
          lines: [{ productId: "risoles", variantId: "default", qty: 1 }],
          deviceKey: "device-a",
        },
        NOW
      )
    await fromDevice("a1")
    await fromDevice("a2")
    await fromDevice("a3")
    await expectCode(fromDevice("a4"), "TOO_MANY_UNPAID")
  })

  test("the rate limiter counts per key and window", async () => {
    const limit = { max: 2, windowMs: 60_000 }
    const check = (key: string, now = NOW) => allowRequest([{ key, limit }], now)
    expect(await check("ip:1")).toBe(true)
    expect(await check("ip:1")).toBe(true)
    expect(await check("ip:1")).toBe(false)
    expect(await check("ip:2")).toBe(true)
    expect(await check("ip:1", new Date(NOW.getTime() + 60_000))).toBe(true)
  })
})

describe("register", () => {
  test("a repeated sale id sells once", async () => {
    const saleId = crypto.randomUUID()
    const sell = () =>
      createWalkInSale(
        { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "es-teh", variantId: "default", qty: 2 }], method: "cash", saleId },
        booth("register-1"),
        NOW
      )
    const [a, b] = await Promise.all([sell(), sell()])
    expect(a.id).toBe(b.id)
    expect((await sell()).id).toBe(a.id)
    expect((await variantOf("es-teh")).walkIn).toBe(2)
  })
})

describe("product management", () => {
  const edit = (stock: number): ProductEdit => ({
    name: "Risoles Mayo",
    description: "Isi 3.",
    category: "food",
    active: true,
    sortOrder: 2,
    variants: [{ id: "default", label: "", priceFen: 1200, stock, onlineCap: 30 }],
  })

  test("saving keeps the counters orders changed, and refuses stock below them", async () => {
    await order([{ productId: "risoles", qty: 3 }])
    const saved = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: "risoles", edit: edit(40) })
    expect(saved.variants[0]).toMatchObject({ priceFen: 1200, stock: 40, onlineOrdered: 3 })
    expect((await variantOf("risoles")).onlineOrdered).toBe(3)
    await expectCode(
      saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: "risoles", edit: edit(2) }),
      "STOCK_BELOW_SOLD"
    )
  })

  test("a save racing orders never loses one", async () => {
    await Promise.all([
      ...Array.from({ length: 5 }, () => order([{ productId: "risoles", qty: 1 }])),
      saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: "risoles", edit: edit(50) }),
    ])
    expect((await variantOf("risoles")).onlineOrdered).toBe(5)
  })

  test("new products get a photo; replacing it deletes the old file", async () => {
    const jpeg = { bytes: new Uint8Array([255, 216, 255, 1]), contentType: "image/jpeg" }
    const created = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, edit: edit(10), image: jpeg })
    expect(created.imagePath).toStartWith(`products/${created.id}-`)
    expect(await readMedia(created.imagePath!)).not.toBeNull()

    const replaced = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: created.id, edit: edit(10), image: jpeg })
    expect(replaced.imagePath).not.toBe(created.imagePath)
    expect(await readMedia(created.imagePath!)).toBeNull()

    const removed = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: created.id, edit: edit(10), image: null })
    expect(removed.imagePath).toBeUndefined()
    await expectCode(
      saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, edit: edit(10), image: { bytes: jpeg.bytes, contentType: "image/heic" } }),
      "INVALID_FILE"
    )
  })

  test("only unsold products can be deleted; others belong to their campaign", async () => {
    await order([{ productId: "risoles", qty: 1 }])
    await expectCode(deleteProduct(SAMPLE_CAMPAIGN_ID, "risoles"), "PRODUCT_IN_USE")
    await expectCode(deleteProduct("other", "gantungan"), "PRODUCT_UNAVAILABLE")
    // The sample bundle holds the gantungan: it must leave the bundle first.
    await expectCode(deleteProduct(SAMPLE_CAMPAIGN_ID, "gantungan"), "PRODUCT_IN_BUNDLE")
    await deleteBundle(SAMPLE_CAMPAIGN_ID, "paket-merch")
    await deleteProduct(SAMPLE_CAMPAIGN_ID, "gantungan")
    expect(await getProduct("gantungan")).toBeNull()
    await expectCode(saveProduct({ campaignId: "other", productId: "risoles", edit: edit(10) }), "PRODUCT_UNAVAILABLE")
  })
})

describe("campaign settings", () => {
  const settings = (overrides: Partial<CampaignSave> = {}): CampaignSave => ({
    name: "Merch SZ Cup",
    slug: "merch",
    codePrefix: "MR",
    tagline: "Kaos dan gantungan kunci.",
    sortOrder: 2,
    status: "draft",
    pickupInfo: "Booth PPIT, SZ Cup",
    onlineOpensAt: OPENED,
    onlineClosesAt: new Date("2027-03-15T23:59:00+08:00"),
    offers: { delivery: false, pickup: true, booth: true },
    deliveryFeeFen: 0,
    deliverySlots: [],
    paymentWindowMinutes: 90,
    accounts: [],
    ...overrides,
  })
  const wx = { id: "wx", method: "wechat" as const, holder: "Nadia", detail: "wxid_nadia" }
  const qrFile = { bytes: new Uint8Array([1, 2]), contentType: "image/png" }

  test("a new campaign sits beside the others; slugs and prefixes can't clash", async () => {
    const created = await saveCampaign(null, settings({ accounts: [{ ...wx, qrImage: qrFile }], cover: png }))
    expect(created.id).toStartWith("merch-")
    expect(created.coverImagePath).toStartWith(`campaigns/${created.id}-cover-`)
    expect((await listCampaigns()).map((c) => c.slug)).toEqual(["gumamchan", "merch"])
    const qr = created.paymentAccounts[0]!.qrImagePath!
    expect(qr).toStartWith(`payment-accounts/${created.id}/wx-`)

    const updated = await saveCampaign(created.id, {
      ...created,
      accounts: [{ ...wx, holder: "Nadia (Treasurer)", removeQr: true }],
      cover: null,
    })
    expect(updated.paymentAccounts[0]).toEqual({ ...wx, holder: "Nadia (Treasurer)" })
    expect(updated.coverImagePath).toBeUndefined()
    expect(await readMedia(qr)).toBeNull()
    expect(await readMedia(created.coverImagePath!)).toBeNull()

    await expectCode(saveCampaign(null, settings({ slug: "gumamchan", codePrefix: "XY" })), "INVALID_CAMPAIGN")
    await expectCode(saveCampaign(null, settings({ slug: "lain", codePrefix: "GC" })), "INVALID_CAMPAIGN")
  })

  test("copied payment accounts get their own QR files", async () => {
    const source = await saveCampaign(null, settings({ accounts: [{ ...wx, qrImage: qrFile }] }))
    const copy = await saveCampaign(null, settings({ slug: "merch-2", codePrefix: "MS", copyAccountsFrom: source.id }))
    const [from, to] = [source.paymentAccounts[0]!.qrImagePath!, copy.paymentAccounts[0]!.qrImagePath!]
    expect(to).toStartWith(`payment-accounts/${copy.id}/wx-`)
    await saveCampaign(source.id, { ...source, accounts: [{ ...wx, removeQr: true }] })
    expect(await readMedia(from)).toBeNull()
    expect(await readMedia(to)).not.toBeNull()
  })
})

describe("test orders", () => {
  const CHECKOUT = "0b6f1c1e-3c3a-4c2e-9a51-6f0d7c1a2b3c"
  const testOrder = (lines: { productId: string; qty: number }[], who: Buyer, extra: { checkoutId?: string } = {}) =>
    createOnlineOrder(
      {
        campaignId: SAMPLE_CAMPAIGN_ID,
        buyer: who,
        lines: lines.map((l) => ({ variantId: "default", ...l })),
        staff: true,
        ...extra,
      },
      NOW
    )

  beforeEach(async () => {
    await clearFirestore()
    // Its ordering window hasn't started: staff can still try it.
    const opensLater = { onlineOpensAt: new Date("2027-04-01T00:00:00+08:00"), onlineClosesAt: null }
    await seedOne({ campaign: { ...sampleCampaign(OPENED), status: "draft", ...opensLater } })
  })

  test("only staff can order in a draft, whatever its dates, and their orders are tests", async () => {
    await expectCode(order([{ productId: "risoles", qty: 1 }]), "ORDERING_NOT_OPEN")
    const created = await testOrder([{ productId: "risoles", qty: 2 }], buyerAs("staff_nadia"))
    expect(created.test).toBe(true)
    expect((await getOrderByToken(created.token, NOW))!.test).toBe(true)
    expect((await variantOf("risoles")).onlineOrdered).toBe(2)
  })

  test("staff can leave any number of test orders unpaid", async () => {
    const who = buyerAs("staff_nadia")
    for (let i = 0; i < 4; i++) await testOrder([{ productId: "risoles", qty: 1 }], who)
    expect(await countTestOrders(SAMPLE_CAMPAIGN_ID)).toBe(4)
  })

  test("an open campaign's orders are real, staff or not", async () => {
    await clearFirestore()
    await seedOne()
    const created = await testOrder([{ productId: "risoles", qty: 1 }], buyerAs("staff_nadia"))
    expect(created.test).toBeUndefined()
    expect(await countTestOrders(SAMPLE_CAMPAIGN_ID)).toBe(0)
  })

  test("a draft can't leave Draft until its test orders are deleted, which gives back their stock", async () => {
    const who = buyerAs("staff_nadia")
    const unpaid = await testOrder([{ productId: "risoles", qty: 2 }], who, { checkoutId: CHECKOUT })
    const collected = await testOrder([{ productId: "risoles", qty: 1 }], who)
    await submitPaymentProof({ token: collected.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await approvePayment(collected.id, admin, NOW)
    await redeemOrder(collected.id, booth("booth-1"), undefined, NOW)
    const cancelled = await testOrder([{ productId: "risoles", qty: 4 }], who)
    await cancelOrder(cancelled.id, admin, "Coba batal", NOW)
    expect((await variantOf("risoles")).onlineOrdered).toBe(3)
    const proof = (await getOrderByToken(collected.token, NOW))!.payment.proofPath!

    const draft = (await getCampaign(SAMPLE_CAMPAIGN_ID))!
    const opening = { ...draft, accounts: draft.paymentAccounts, status: "open" as const }
    await expectCode(saveCampaign(draft.id, opening), "INVALID_CAMPAIGN")

    expect(await deleteTestOrders(SAMPLE_CAMPAIGN_ID)).toBe(3)
    expect((await variantOf("risoles")).onlineOrdered).toBe(0)
    expect(await countTestOrders(SAMPLE_CAMPAIGN_ID)).toBe(0)
    expect(await campaignHasOrders(SAMPLE_CAMPAIGN_ID)).toBe(false)
    expect(await getOrderByToken(unpaid.token, NOW)).toBeNull()
    expect(await findOrderByCode(collected.code)).toBeNull()
    expect(await findOrderByCheckout(CHECKOUT)).toBeNull()
    expect(await readMedia(proof)).toBeNull()

    expect((await saveCampaign(draft.id, opening)).status).toBe("open")
  })
})

describe("several campaigns at once", () => {
  beforeEach(async () => {
    await clearFirestore()
    await writeSamples({
      campaigns: [sampleCampaign(OPENED), sampleMerchCampaign(OPENED)],
      products: sampleProducts(SAMPLE_CAMPAIGN_ID, SAMPLE_MERCH_ID),
      bundles: sampleBundles(SAMPLE_MERCH_ID),
    })
  })
  const kaos = [{ productId: "kaos-szcup", variantId: "m", qty: 1 }]

  test("codes carry the campaign's prefix and are found however they are typed", async () => {
    const merch = await createOnlineOrder({ campaignId: SAMPLE_MERCH_ID, buyer, lines: kaos }, NOW)
    const food = await order([{ productId: "nasi-kuning", qty: 1 }])
    expect(merch.code).toMatch(/^MR-/)
    expect(food.code).toMatch(/^GC-/)
    expect((await findOrderByCode(merch.code.toLowerCase().replace("-", " ")))!.id).toBe(merch.id)
    expect((await findOrderByCode(merch.code.slice(3)))!.id).toBe(merch.id)
    // Each campaign sells only its own products.
    await expectCode(order(kaos), "PRODUCT_UNAVAILABLE")
  })

  test("the queues cover every campaign", async () => {
    const merch = await createOnlineOrder({ campaignId: SAMPLE_MERCH_ID, buyer, lines: kaos }, NOW)
    const food = await order([{ productId: "nasi-kuning", qty: 1 }])
    for (const o of [merch, food]) await submitPaymentProof({ token: o.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    expect(await countAwaitingVerification()).toBe(2)
    expect(await countAwaitingVerification(SAMPLE_MERCH_ID)).toBe(1)
    expect((await listAwaitingVerification()).map((o) => o.id).sort()).toEqual([merch.id, food.id].sort())
    expect((await listOrders()).map((o) => o.id).sort()).toEqual([merch.id, food.id].sort())
  })

  test("the featured product must be one of the campaign's own", async () => {
    const food = (await getCampaign(SAMPLE_CAMPAIGN_ID))!
    const save = (featuredProductId: string | null) =>
      saveCampaign(food.id, { ...food, accounts: food.paymentAccounts, featuredProductId })
    expect((await save("risoles")).featuredProductId).toBe("risoles")
    await expectCode(save("tidak-ada"), "INVALID_FEATURED")
    expect((await save(null)).featuredProductId).toBeUndefined()
    expect((await getCampaign(food.id))!.featuredProductId).toBeUndefined()
  })

  test("orders fix the slug; a closed campaign stops selling and frees its slug", async () => {
    const sold = await createOnlineOrder({ campaignId: SAMPLE_MERCH_ID, buyer, lines: kaos }, NOW)
    const merch = (await getCampaign(SAMPLE_MERCH_ID))!
    const save = (patch: Partial<CampaignSave>) => saveCampaign(merch.id, { ...merch, accounts: merch.paymentAccounts, ...patch })
    await expectCode(save({ slug: "merch-baru" }), "INVALID_CAMPAIGN")

    await save({ status: "closed" })
    await expectCode(createWalkInSale({ campaignId: merch.id, lines: kaos, method: "cash" }, booth("register-1"), NOW), "CAMPAIGN_CLOSED")
    await expectCode(
      createOnlineOrder({ campaignId: merch.id, buyer: buyerAs("lain"), lines: kaos }, NOW),
      "ORDERING_CLOSED"
    )
    expect((await getCampaignBySlug("merch"))!.id).toBe(merch.id)

    const next = await saveCampaign(null, {
      ...merch,
      name: "Merch Welcome Party",
      codePrefix: "MW",
      status: "open",
      accounts: [],
    })
    expect((await getCampaignBySlug("merch"))!.id).toBe(next.id)
    // The closed campaign's orders still open by their code.
    expect((await findOrderByCode(sold.code))!.id).toBe(sold.id)
  })
})

describe("bundles", () => {
  // Paket Merch SZ Cup: one Kaos (pick a size) and one Gantungan Kunci, ¥88.
  const bundleLine = (size: string, qty = 1) => ({ bundleId: "paket-merch", picks: [size, "default"], qty })

  test("a ordered online bundle takes its components' stock, and expiry gives it back", async () => {
    const created = await createOnlineOrder(
      { campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [bundleLine("m", 2), { productId: "kaos-szcup", variantId: "m", qty: 1 }] },
      NOW
    )
    expect(created.totalFen).toBe(2 * 8800 + 8000)
    expect(created.items[0]).toMatchObject({ bundleId: "paket-merch", qty: 2, variantLabel: "Kaos SZ Cup 2027 M + Gantungan Kunci" })
    expect((await variantOf("kaos-szcup", "m")).onlineOrdered).toBe(3)
    expect((await variantOf("gantungan")).onlineOrdered).toBe(2)

    const later = new Date(created.expiresAt!.getTime() + 1)
    expect((await getOrderByToken(created.token, later))!.status).toBe("expired")
    expect((await variantOf("kaos-szcup", "m")).onlineOrdered).toBe(0)
    expect((await variantOf("gantungan")).onlineOrdered).toBe(0)
  })

  test("bundles and singles can't oversell a shared variant", async () => {
    // Kaos XL: 15 units, no cap.
    await createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "kaos-szcup", variantId: "xl", qty: 14 }], method: "cash" },
      booth("register-1"),
      NOW
    )
    const results = await Promise.allSettled([
      createOnlineOrder({ campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [bundleLine("xl")] }, NOW),
      createOnlineOrder(
        { campaignId: SAMPLE_CAMPAIGN_ID, buyer: buyerAs("other_buyer"), lines: [bundleLine("xl")] },
        NOW
      ),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const xl = await variantOf("kaos-szcup", "xl")
    expect(xl.onlineOrdered + xl.walkIn).toBe(15)
  })

  test("undoing a register bundle sale returns every unit", async () => {
    const sale = await createWalkInSale(
      { campaignId: SAMPLE_CAMPAIGN_ID, lines: [bundleLine("l")], method: "cash" },
      booth("register-1"),
      NOW
    )
    expect(sale.items[0]!.pickedUp).toBe(true)
    expect((await variantOf("kaos-szcup", "l")).walkIn).toBe(1)
    await cancelOrder(sale.id, booth("register-1"), "Salah input", NOW)
    expect((await variantOf("kaos-szcup", "l")).walkIn).toBe(0)
    expect((await variantOf("gantungan")).walkIn).toBe(0)
  })

  test("a hidden bundle can't be bought, and deleting it keeps its orders", async () => {
    const created = await createOnlineOrder({ campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [bundleLine("s")] }, NOW)
    const current = (await getBundle("paket-merch"))!
    await saveBundle({ campaignId: SAMPLE_CAMPAIGN_ID, bundleId: current.id, edit: { ...current, active: false } })
    expect(await listBundles(SAMPLE_CAMPAIGN_ID)).toEqual([])
    await expectCode(
      createOnlineOrder({ campaignId: SAMPLE_CAMPAIGN_ID, buyer: buyerAs("x"), lines: [bundleLine("s")] }, NOW),
      "PRODUCT_UNAVAILABLE"
    )
    await deleteBundle(SAMPLE_CAMPAIGN_ID, "paket-merch")
    expect((await getOrderByToken(created.token, NOW))!.items[0]!.name).toBe("Paket Merch SZ Cup")
  })

  test("components must be products of the same campaign", async () => {
    const other: Product = { ...sampleProducts("other")[0]!, id: "other-food" }
    await seedOne({ campaign: otherCampaign(), products: [other], bundles: [] })
    await seedOne()
    const edit = {
      name: "Paket Campur",
      description: "",
      priceFen: 2000,
      active: true,
      sortOrder: 2,
      components: [
        { productId: "nasi-kuning", qty: 1 },
        { productId: "other-food", qty: 1 },
      ],
    }
    await expectCode(saveBundle({ campaignId: SAMPLE_CAMPAIGN_ID, edit }), "INVALID_BUNDLE")
    const saved = await saveBundle({
      campaignId: SAMPLE_CAMPAIGN_ID,
      edit: { ...edit, components: [{ productId: "nasi-kuning", qty: 1 }, { productId: "es-teh", qty: 1 }] },
      image: png,
    })
    expect(saved.imagePath).toStartWith(`bundles/${saved.id}-`)
    expect((await listBundles(SAMPLE_CAMPAIGN_ID)).map((b) => b.id)).toEqual(["paket-merch", saved.id])
    await deleteBundle(SAMPLE_CAMPAIGN_ID, saved.id)
    expect(await readMedia(saved.imagePath!)).toBeNull()
  })
})

describe("size charts", () => {
  test("are stored with the product, replaced and removed like its photo", async () => {
    const kaos = (await getProduct("kaos-szcup"))!
    const edit = { ...kaos, variants: kaos.variants.map(({ onlineOrdered: _p, walkIn: _w, ...v }) => v) }
    const withChart = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: kaos.id, edit, sizeChart: png })
    expect(withChart.sizeChartPath).toStartWith("products/kaos-szcup-size-chart-")
    expect(withChart.imagePath).toBeUndefined()

    const photoOnly = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: kaos.id, edit, image: png })
    expect(photoOnly.sizeChartPath).toBe(withChart.sizeChartPath)

    const removed = await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: kaos.id, edit, sizeChart: null })
    expect(removed.sizeChartPath).toBeUndefined()
    expect(removed.imagePath).toBe(photoOnly.imagePath)
    expect(await readMedia(withChart.sizeChartPath!)).toBeNull()
  })
})

describe("refunds", () => {
  test("a paid order canceled by an admin gets its refund recorded once, for the buyer to see", async () => {
    const created = await createOnlineOrder(
      { campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [{ productId: "kaos-szcup", variantId: "m", qty: 1 }] },
      NOW
    )
    await submitPaymentProof({ token: created.token, file: png, accountId: "wechat-1", transactionDigits: TXN }, NOW)
    await approvePayment(created.id, admin, NOW)
    const later = new Date(NOW.getTime() + 60_000)
    await cancelOrder(created.id, admin, "Ukuran habis", later)
    await expectCode(recordRefund(created.id, booth("register-1"), { amountFen: 8000, method: "wechat", note: "" }), "NOT_ALLOWED")

    await recordRefund(created.id, admin, { amountFen: 8000, method: "wechat", note: "ke wxid budi" }, later)
    const stored = (await getOrderByToken(created.token, later))!
    expect(stored.cancelledAt).toEqual(later)
    expect(stored.refund).toEqual({ amountFen: 8000, method: "wechat", note: "ke wxid budi", at: later, by: "admin-1" })
    await expectCode(recordRefund(created.id, admin, { amountFen: 8000, method: "wechat", note: "" }), "ALREADY_REFUNDED")
  })
})

describe("size chart tables", () => {
  test("columns live on the product and each size's row on its variant, through every save", async () => {
    const kaos = (await getProduct("kaos-szcup"))!
    expect(kaos.sizeChart?.measures).toEqual(["Lebar dada", "Panjang badan", "Panjang lengan"])
    const edit: ProductEdit = {
      ...kaos,
      sizeChart: { measures: ["Lebar dada"], note: "" },
      variants: kaos.variants.map(({ onlineOrdered: _p, walkIn: _w, measurements, ...v }) => ({
        ...v,
        measurements: [measurements![0]!],
      })),
    }
    await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: kaos.id, edit })
    // An order writes the variants back: their rows must survive it.
    await createOnlineOrder({ campaignId: SAMPLE_CAMPAIGN_ID, buyer, lines: [{ productId: "kaos-szcup", variantId: "m", qty: 1 }] }, NOW)
    const saved = (await getProduct("kaos-szcup"))!
    expect(saved.sizeChart).toEqual({ measures: ["Lebar dada"], note: "" })
    expect(saved.variants.map((v) => v.measurements)).toEqual([["48"], ["51"], ["54"], ["57"]])
    expect(saved.variants.find((v) => v.id === "m")!.onlineOrdered).toBe(1)
  })
})

describe("delivery", () => {
  // The sample food campaign delivers in two slots from OPENED: "sabtu" (max 20) and "minggu".
  const deliver = (
    slotId = "sabtu",
    now = NOW,
    who: Buyer = buyerAs(`antar_${++buyers}`)
  ) =>
    createOnlineOrder(
      {
        campaignId: SAMPLE_CAMPAIGN_ID,
        buyer: who,
        lines: [{ productId: "risoles", variantId: "default", qty: 2 }],
        fulfillment: { type: "delivery", address: "SZU 粤海 斋区 5栋 302", slotId },
      },
      now
    )
  const pay = async (id: string, token: string, now = NOW) => {
    await submitPaymentProof({ token, file: png, accountId: "wechat-1", transactionDigits: TXN }, now)
    await approvePayment(id, admin, now)
  }

  test("a delivery order adds the fee once and keeps a copy of its slot and address", async () => {
    const created = await deliver()
    expect(created.totalFen).toBe(2 * 1000 + 500)
    expect(created.delivery).toMatchObject({ address: "SZU 粤海 斋区 5栋 302", feeFen: 500 })
    expect(created.delivery!.slot.id).toBe("sabtu")
    expect((await getOrderByToken(created.token, NOW))!.delivery).toEqual(created.delivery)
  })

  test("it needs a phone, an address and a slot that is open", async () => {
    const noPhone = buyerAs("tanpa_hp", { phone: "" })
    await expectCode(deliver("sabtu", NOW, noPhone), "INVALID_DELIVERY")
    await expectCode(deliver("nope"), "SLOT_UNAVAILABLE")
    // The slot has started.
    await expectCode(deliver("sabtu", new Date("2027-03-05T16:00:00+08:00")), "SLOT_UNAVAILABLE")
    await seedOne({ campaign: { ...sampleCampaign(OPENED), offers: { delivery: false, pickup: true, booth: true } } })
    await expectCode(deliver(), "FULFILLMENT_UNAVAILABLE")
  })

  test("a full slot refuses more orders, until an unpaid one expires", async () => {
    const campaign = sampleCampaign(OPENED)
    campaign.deliverySlots = campaign.deliverySlots.map((s) => ({ ...s, maxOrders: s.id === "sabtu" ? 1 : null }))
    await seedOne({ campaign })
    const first = await deliver()
    await expectCode(deliver(), "SLOT_UNAVAILABLE")
    expect((await slotPlaces(campaign, NOW)).get("sabtu")).toBe(1)
    await deliver("minggu")

    const afterDeadline = new Date(first.expiresAt!.getTime() + 1000)
    expect((await slotPlaces(campaign, afterDeadline)).get("sabtu")).toBe(0)
    await deliver("sabtu", afterDeadline)
  })

  test("Pickup stays the default and carries no fee", async () => {
    const collected = await order([{ productId: "risoles", qty: 1 }])
    expect(collected.delivery).toBeUndefined()
    expect(collected.totalFen).toBe(1000)
  })

  test("sent by courier, then delivered whole; the delivery list follows", async () => {
    const created = await createOnlineOrder(
      {
        campaignId: SAMPLE_CAMPAIGN_ID,
        buyer,
        lines: [
          { productId: "risoles", variantId: "default", qty: 1 },
          { productId: "nasi-kuning", variantId: "default", qty: 1 },
        ],
        fulfillment: { type: "delivery", address: "SZU 粤海 斋区 5栋 302", slotId: "sabtu" },
      },
      NOW
    )
    await pay(created.id, created.token)
    expect((await listAwaitingDelivery()).map((o) => o.id)).toEqual([created.id])

    await expectCode(redeemOrder(created.id, booth("kurir-1"), [0], NOW), "DELIVERY_WHOLE")
    await expectCode(sendByCourier(created.id, booth("kurir-1"), { courier: "SF", trackingNumber: " " }, NOW), "INVALID_COURIER")
    const sent = await sendByCourier(created.id, booth("kurir-1"), { courier: "SF Express", trackingNumber: "SF123" }, NOW)
    expect(sent.status).toBe("paid")
    expect(sent.delivery).toMatchObject({ courier: "SF Express", trackingNumber: "SF123", sentAt: NOW, sentBy: "kurir-1" })

    const delivered = (await redeemOrder(created.id, booth("kurir-1"), undefined, NOW)).order
    expect(delivered.status).toBe("picked_up")
    expect(await listAwaitingDelivery()).toEqual([])
  })

  test("a canceled delivery order owes its fee back too", async () => {
    const created = await deliver()
    await pay(created.id, created.token)
    await cancelOrder(created.id, admin, "Alamat di luar jangkauan", NOW)
    await recordRefund(created.id, admin, { amountFen: 2500, method: "wechat", note: "" }, NOW)
    expect((await getOrderByToken(created.token, NOW))!.refund?.amountFen).toBe(2500)
  })

  test("without a booth: no register sales, and the online cap no longer holds stock back", async () => {
    await seedOne({ campaign: { ...sampleCampaign(OPENED), offers: { delivery: true, pickup: true, booth: false } } })
    await expectCode(
      createWalkInSale({ campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "risoles", variantId: "default", qty: 1 }], method: "cash" }, admin, NOW),
      "NO_BOOTH"
    )
    // Es teh has an online cap of 0: booth only, until there is no booth.
    const created = await order([{ productId: "es-teh", qty: 2 }])
    expect(created.items[0]!.qty).toBe(2)
  })
})

describe("sale dates", () => {
  test("a seasonal product is refused before and after its dates, and its dates survive saves", async () => {
    const risoles = (await getProduct("risoles"))!
    const from = new Date(NOW.getTime() + 3_600_000)
    const until = new Date(NOW.getTime() + 2 * 3_600_000)
    const edit: ProductEdit = {
      ...risoles,
      onSaleFrom: from,
      onSaleUntil: until,
      variants: risoles.variants.map(({ onlineOrdered: _o, walkIn: _w, ...v }) => v),
    }
    await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: risoles.id, edit })
    const saved = (await getProduct("risoles"))!
    expect([saved.onSaleFrom, saved.onSaleUntil]).toEqual([from, until])

    await expectCode(order([{ productId: "risoles", qty: 1 }]), "PRODUCT_UNAVAILABLE")
    await expectCode(
      createWalkInSale({ campaignId: SAMPLE_CAMPAIGN_ID, lines: [{ productId: "risoles", variantId: "default", qty: 1 }], method: "cash" }, admin, NOW),
      "PRODUCT_UNAVAILABLE"
    )
    await order([{ productId: "risoles", qty: 1 }], new Date(from.getTime() + 60_000))
    await expectCode(order([{ productId: "risoles", qty: 1 }], until), "PRODUCT_UNAVAILABLE")
  })
})

describe("buyer profiles", () => {
  const account = { uid: "u-sari", email: "sari@test.test" }

  test("saved and updated, keeping when the account was made", async () => {
    expect(await getBuyerProfile(account.uid)).toBeNull()
    await saveBuyerProfile(account, { name: "Sari", wechatId: "sari", phone: "" }, NOW)
    await saveBuyerProfile(account, { name: "Sari W", wechatId: "sari_w", phone: "123" }, new Date(NOW.getTime() + 60_000))
    expect(await getBuyerProfile(account.uid)).toEqual({
      ...account,
      name: "Sari W",
      wechatId: "sari_w",
      phone: "123",
      birthday: "",
      cohortYear: null,
      avatarPath: "",
      providerAvatarPath: "",
      createdAt: NOW,
      updatedAt: new Date(NOW.getTime() + 60_000),
    })
  })

  test("an account without one gets an empty profile; an existing one keeps its fields and follows the email", async () => {
    await ensureBuyerProfile({ uid: "u-staf", email: "staf@test.test" }, "Nadia", NOW)
    expect(await getBuyerProfile("u-staf")).toMatchObject({ name: "Nadia", wechatId: "", phone: "" })

    await saveBuyerProfile(account, { name: "Sari", wechatId: "sari", phone: "" }, NOW)
    await ensureBuyerProfile({ ...account, email: "baru@test.test" }, "Lain")
    expect(await getBuyerProfile(account.uid)).toMatchObject({ name: "Sari", wechatId: "sari", email: "baru@test.test" })
  })

  test("share the old website's record, with WeChat ID and phone kept out of it (ADR 0014)", async () => {
    // As the old website leaves it after its own sign-up.
    await db().collection("users").doc(account.uid).set({
      email: account.email,
      name: "Sari",
      admin: false,
      status: "active",
      birthday: "2004-08-17",
      cohortYear: 2023,
      submittedForms: ["f1"],
    })
    expect(await getBuyerProfile(account.uid)).toMatchObject({ name: "Sari", birthday: "2004-08-17", cohortYear: 2023, phone: "" })

    // Checkout saves name and contact only: the rest of the record stays.
    await saveBuyerProfile(account, { name: "Sari W", wechatId: "sari_w", phone: "123" }, NOW)
    const shared = (await db().collection("users").doc(account.uid).get()).data()!
    expect(shared).toMatchObject({ name: "Sari W", birthday: "2004-08-17", cohortYear: 2023, submittedForms: ["f1"], status: "active" })
    expect(shared).not.toHaveProperty("phone")
    expect(shared).not.toHaveProperty("wechatId")
    const contact = (await db().collection("users").doc(account.uid).collection("private").doc("contact").get()).data()
    expect(contact).toMatchObject({ wechatId: "sari_w", phone: "123" })
    expect(await getBuyerProfile(account.uid)).toMatchObject({ name: "Sari W", wechatId: "sari_w", phone: "123", birthday: "2004-08-17" })
  })
})

describe("labels and allergens", () => {
  test("survive a save, cleaned", async () => {
    const risoles = (await getProduct("risoles"))!
    const edit: ProductEdit = {
      ...risoles,
      tags: [" Weekly ", "weekly"],
      allergens: ["Coconut"],
      variants: risoles.variants.map(({ onlineOrdered: _o, walkIn: _w, ...v }) => v),
    }
    await saveProduct({ campaignId: SAMPLE_CAMPAIGN_ID, productId: risoles.id, edit })
    expect(await getProduct("risoles")).toMatchObject({ tags: ["Weekly"], allergens: ["Coconut"] })
  })
})
