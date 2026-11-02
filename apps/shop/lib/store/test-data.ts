import type { Bundle, Campaign, DeliverySlot, Product } from "../domain/types"
import { db } from "../firebase/admin"
import { bundleToDoc, campaignToDoc, productToDoc } from "./convert"

/*
 * Fixed data for the integration tests (store.test.ts): two campaigns open at
 * once, GumamChan (food) and Merch, as at SZ Cup 2027. The tests depend on
 * these ids, prices and stock, so change them together with the tests.
 */

/**
 * Writes campaigns, products and bundles to the test emulator as they are,
 * next to whatever is there already. Tests only: they run against a
 * throwaway emulator, never the real project.
 */
export async function writeSamples(data: { campaigns: Campaign[]; products: Product[]; bundles: Bundle[] }) {
  const batch = db().batch()
  for (const c of data.campaigns) batch.set(db().collection("campaigns").doc(c.id), campaignToDoc(c))
  for (const p of data.products) batch.set(db().collection("products").doc(p.id), productToDoc(p))
  for (const b of data.bundles) batch.set(db().collection("bundles").doc(b.id), bundleToDoc(b))
  await batch.commit()
}

export const SAMPLE_CAMPAIGN_ID = "gumamchan-2027"
export const SAMPLE_MERCH_ID = "merch-2027"

/** The food campaign. The tests also use it alone, holding every sample product. */
export function sampleCampaign(now = new Date()): Campaign {
  return {
    id: SAMPLE_CAMPAIGN_ID,
    name: "GumamChan · SZ Cup 2027",
    slug: "gumamchan",
    codePrefix: "GC",
    tagline: "Makanan rumahan Indonesia. Diantar ke asrama, atau ambil di booth Danus.",
    featuredProductId: "nasi-kuning",
    sortOrder: 1,
    status: "open",
    // Open from now so the flow can be tried locally; the real window is
    // 3–15 Mar 2027.
    onlineOpensAt: new Date(now.getTime() - 86_400_000),
    onlineClosesAt: new Date("2027-03-15T23:59:00+08:00"),
    offers: { delivery: true, pickup: true, booth: true },
    pickupInfo: "Booth Danus di SZ Cup · Rab, 17 Mar 2027, 09.00–17.00",
    deliveryFeeFen: 5_00,
    // Slots in the coming days, so they can be picked locally.
    deliverySlots: [slot("sabtu", now, 2, 15, 18, 20), slot("minggu", now, 3, 11, 14, null)],
    paymentWindowMinutes: 120,
    paymentAccounts: [
      { id: "wechat-1", method: "wechat", holder: "Contoh: Bendahara Danus", detail: "wxid_contoh" },
      { id: "alipay-1", method: "alipay", holder: "Contoh: Bendahara Danus", detail: "contoh@alipay" },
    ],
  }
}

/** A slot `days` after today in Shenzhen, from `from` to `to` o'clock. */
function slot(id: string, now: Date, days: number, from: number, to: number, maxOrders: number | null): DeliverySlot {
  const hour = 3_600_000
  const today = Math.floor((now.getTime() + 8 * hour) / (24 * hour)) * 24 * hour - 8 * hour
  const day = today + days * 24 * hour
  return { id, startsAt: new Date(day + from * hour), endsAt: new Date(day + to * hour), maxOrders }
}

function v(id: string, label: string, yuan: number, stock: number, onlineCap: number | null) {
  return { id, label, priceFen: yuan * 100, stock, onlineCap, onlineOrdered: 0, walkIn: 0 }
}

export function sampleMerchCampaign(now = new Date()): Campaign {
  return {
    ...sampleCampaign(now),
    id: SAMPLE_MERCH_ID,
    name: "Merch SZ Cup 2027",
    slug: "merch",
    codePrefix: "MR",
    tagline: "Kaos dan gantungan kunci resmi SZ Cup 2027. Gratis ongkir.",
    // None: the homepage shows its cover photo instead, when it leads.
    featuredProductId: undefined,
    sortOrder: 2,
    deliveryFeeFen: 0,
    deliverySlots: [slot("pekan-ini", now, 4, 10, 20, null)],
  }
}

/** Every sample product: the food first, then the merchandise. */
export function sampleProducts(campaignId = SAMPLE_CAMPAIGN_ID, merchCampaignId = campaignId): Product[] {
  return [...sampleFood(campaignId), ...sampleMerch(merchCampaignId)]
}

function sampleFood(campaignId: string): Product[] {
  const base = { campaignId, active: true, imagePath: undefined, tags: [], allergens: [] }
  return [
    {
      ...base,
      id: "nasi-kuning",
      name: "Nasi Kuning",
      description: "Nasi kuning dengan ayam suwir, telur dan sambal. Halal.",
      category: "food",
      sortOrder: 1,
      variants: [v("default", "", 15, 60, 40)],
    },
    {
      ...base,
      id: "risoles",
      name: "Risoles Mayo",
      description: "Isi 3. Halal.",
      category: "food",
      sortOrder: 2,
      variants: [v("default", "", 10, 50, 30)],
    },
    {
      ...base,
      id: "seblak",
      name: "Seblak",
      description: "Kerupuk basah kuah pedas. Halal.",
      category: "food",
      sortOrder: 3,
      variants: [v("sedang", "Pedas sedang", 12, 20, 10), v("pedas", "Pedas banget", 12, 20, 10)],
    },
    {
      ...base,
      id: "es-teh",
      name: "Es Teh Manis",
      description: "Hanya dijual langsung di booth.",
      category: "food",
      sortOrder: 4,
      variants: [v("default", "", 5, 80, 0)],
    },
  ]
}

function sampleMerch(campaignId: string): Product[] {
  const base = { campaignId, active: true, imagePath: undefined, tags: [], allergens: [] }
  return [
    {
      ...base,
      id: "kaos-szcup",
      name: "Kaos SZ Cup 2027",
      description: "Katun combed 24s. Lihat tabel ukuran sebelum memesan.",
      category: "merch",
      sortOrder: 10,
      sizeChart: {
        measures: ["Lebar dada", "Panjang badan", "Panjang lengan"],
        note: "Diukur rata dari ketiak ke ketiak. Potongan Asia: kalau ragu, pilih satu ukuran lebih besar.",
      },
      variants: [
        { ...v("s", "S", 80, 15, null), measurements: ["48", "68", "20"] },
        { ...v("m", "M", 80, 25, null), measurements: ["51", "71", "21"] },
        { ...v("l", "L", 80, 25, null), measurements: ["54", "74", "22"] },
        { ...v("xl", "XL", 85, 15, null), measurements: ["57", "76", "23"] },
      ],
    },
    {
      ...base,
      id: "gantungan",
      name: "Gantungan Kunci",
      description: "Akrilik, logo SZ Cup 2027.",
      category: "merch",
      sortOrder: 11,
      variants: [v("default", "", 15, 40, null)],
    },
  ]
}

export function sampleBundles(campaignId = SAMPLE_CAMPAIGN_ID): Bundle[] {
  return [
    {
      id: "paket-merch",
      campaignId,
      name: "Paket Merch SZ Cup",
      description: "Kaos ukuran pilihanmu dan gantungan kunci.",
      priceFen: 88_00,
      active: true,
      sortOrder: 1,
      components: [
        { productId: "kaos-szcup", qty: 1 },
        { productId: "gantungan", qty: 1 },
      ],
    },
  ]
}
