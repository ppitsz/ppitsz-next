import type { Bundle, Campaign, Order, Product, Variant } from "./types"

/* Builders for the domain tests. */

export function variant(overrides: Partial<Variant> = {}): Variant {
  return { id: "v1", label: "", priceFen: 1500, stock: 10, onlineCap: 6, onlineOrdered: 0, walkIn: 0, ...overrides }
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    campaignId: "c1",
    name: "Nasi Kuning",
    description: "",
    category: "food",
    active: true,
    tags: [],
    allergens: [],
    sortOrder: 0,
    variants: [variant()],
    ...overrides,
  }
}

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    code: "GC-AAAA",
    token: "t",
    campaignId: "c1",
    channel: "online",
    buyer: { uid: "u-a", email: "a@test.test", name: "A", wechatId: "a", phone: "" },
    items: [
      { productId: "p1", variantId: "v1", name: "Nasi", variantLabel: "", priceFen: 1500, qty: 2, pickedUp: false },
      { productId: "p2", variantId: "m", name: "Kaos", variantLabel: "M", priceFen: 8000, qty: 1, pickedUp: false },
    ],
    totalFen: 11000,
    status: "paid",
    payment: {},
    rejections: [],
    createdAt: new Date(0),
    expiresAt: null,
    pickedUpAt: null,
    handledBy: null,
    ...overrides,
  }
}

export function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "SZ Cup",
    slug: "sz-cup",
    codePrefix: "GC",
    tagline: "",
    sortOrder: 0,
    status: "open",
    onlineOpensAt: new Date(0),
    onlineClosesAt: new Date("2027-03-15T23:59:00+08:00"),
    offers: { delivery: true, pickup: true, booth: true },
    pickupInfo: "Booth Danus",
    deliveryFeeFen: 500,
    deliverySlots: [
      {
        id: "sabtu",
        startsAt: new Date("2027-03-13T15:00:00+08:00"),
        endsAt: new Date("2027-03-13T18:00:00+08:00"),
        maxOrders: 2,
      },
    ],
    paymentWindowMinutes: 120,
    paymentAccounts: [
      { id: "wx", method: "wechat", holder: "Nadia", detail: "wxid_nadia" },
      { id: "ali", method: "alipay", holder: "Nadia", detail: "nadia@alipay" },
    ],
    ...overrides,
  }
}

/** A shirt with sizes M and L, and a sticker without options. */
export function merch() {
  const shirt = product({
    id: "kaos",
    name: "Kaos",
    category: "merch",
    variants: [
      variant({ id: "m", label: "M", priceFen: 8000, stock: 5, onlineCap: null }),
      variant({ id: "l", label: "L", priceFen: 8000, stock: 5, onlineCap: null }),
    ],
  })
  const sticker = product({
    id: "stiker",
    name: "Stiker",
    category: "merch",
    variants: [variant({ id: "default", priceFen: 1000, stock: 10, onlineCap: null })],
  })
  return { shirt, sticker }
}

export function bundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: "paket",
    campaignId: "c1",
    name: "Paket Merch",
    description: "",
    priceFen: 8500,
    active: true,
    sortOrder: 0,
    components: [
      { productId: "kaos", qty: 1 },
      { productId: "stiker", qty: 2 },
    ],
    ...overrides,
  }
}

export const byId = <T extends { id: string }>(...records: T[]) => new Map(records.map((r) => [r.id, r]))
