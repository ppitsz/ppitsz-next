/*
 * The shop's data model. Plain types with Date, independent of Firestore;
 * lib/store converts to and from documents.
 *
 * Money is always an integer number of fen (1/100 yuan), never a float.
 */

/* -------------------------------------------------------------------------
   Campaign — one sale period, e.g. SZ Cup 2027. Products belong to it.
   ------------------------------------------------------------------------- */

export const PAYMENT_METHODS = ["wechat", "alipay", "bank", "cash"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** An account buyers transfer to. Cash has no account. */
export interface PaymentAccount {
  id: string
  method: Exclude<PaymentMethod, "cash">
  /** Whose account it is, as the buyer sees it in their app: "Nadia (Danus)". */
  holder: string
  /** WeChat ID, Alipay account or bank + number. */
  detail: string
  /** Storage path of the account's receive-money QR (收款码), if any. */
  qrImagePath?: string
}

/**
 * draft: hidden from buyers, staff can preview it. open: listed and sold;
 * its online order dates decide what buyers can do. closed: off the list, no
 * checkout; its orders keep working.
 */
export const CAMPAIGN_STATUSES = ["draft", "open", "closed"] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export interface Campaign {
  id: string
  name: string
  /** The URL name: /gumamchan. Unique among draft and open campaigns; a closed one's can be reused. */
  slug: string
  /** Starts every order code: "GC" → GC-7K3P. Unique among campaigns. */
  codePrefix: string
  /** One line for the campaign's card and catalog header. */
  tagline: string
  /** Storage path of the cover photo, served through /media. */
  coverImagePath?: string
  /** The product shown in the homepage hero; the cover photo when unset. */
  featuredProductId?: string
  /** Order on the main page; smaller first. */
  sortOrder: number
  status: CampaignStatus
  /** Online orders are accepted from opensAt until closesAt (the cutoff); null: no limit on that side. */
  onlineOpensAt: Date | null
  onlineClosesAt: Date | null
  /** How this campaign sells. At least one is on. */
  offers: CampaignOffers
  /** Where and when pickup orders are collected: "Booth Danus, SZ Cup · Wed, Mar 17". */
  pickupInfo: string
  /** Added once to every delivery order; 0 is free delivery. */
  deliveryFeeFen: number
  /** When delivery orders arrive, in time order. At least one while delivery is offered. */
  deliverySlots: DeliverySlot[]
  paymentAccounts: PaymentAccount[]
  /** An order without payment proof is released after this many minutes. */
  paymentWindowMinutes: number
}

/** delivery: online orders delivered. pickup: online orders collected at the pickup place. booth: walk-in sales at the kasir. */
export interface CampaignOffers {
  delivery: boolean
  pickup: boolean
  booth: boolean
}

/** A time range a delivery order can be delivered in, with an optional limit on orders. */
export interface DeliverySlot {
  id: string
  startsAt: Date
  endsAt: Date
  /** Null: no limit. */
  maxOrders: number | null
}

/* -------------------------------------------------------------------------
   Products and variants — each variant has its own price and stock.
   A product without options has a single variant with an empty label.
   ------------------------------------------------------------------------- */

export const CATEGORIES = ["food", "merch"] as const
export type Category = (typeof CATEGORIES)[number]

export interface Variant {
  id: string
  /** "M", "Spicy"; empty for a product without options. */
  label: string
  priceFen: number
  /** Physical units Danus has (or will make) for this campaign. */
  stock: number
  /** The most units online orders may take; the rest is held for walk-ins. Null: no cap. Ignored without a booth. */
  onlineCap: number | null
  /** Units taken by live online orders (pending, paid or picked up). */
  onlineOrdered: number
  /** Units sold at the booth. */
  walkIn: number
  /** This size's row in the product's size chart, one value in cm per measure: "52", "50–52". */
  measurements?: string[]
}

/** A size chart typed by an admin. Each variant holds its own row. */
export interface SizeChart {
  /** The columns, measured in cm: "Lebar dada", "Panjang badan". */
  measures: string[]
  /** How to read or choose: "Measured flat. Size up if unsure." */
  note: string
}

export interface Product {
  id: string
  campaignId: string
  name: string
  description: string
  category: Category
  /** Storage path, served through /media. */
  imagePath?: string
  /** The measurement table; each variant holds its row. */
  sizeChart?: SizeChart
  /** Storage path of a size chart image (from the maker, or how to measure), served through /media. */
  sizeChartPath?: string
  /** Short labels buyers see on the product: "New", "Spicy", "Weekly". */
  tags: string[]
  /** What it contains or may contain, one per entry: "Coconut", "May contain shrimp paste". */
  allergens: string[]
  /**
   * Hidden from the catalog and the kasir when false. A bundle can still
   * contain it, for items sold only in a bundle.
   */
  active: boolean
  /** Sold on its own from this moment (a seasonal item); absent: no start. Bundles holding it ignore it, as with `active`. */
  onSaleFrom?: Date
  /** Sold on its own until this moment; absent: until the campaign ends. */
  onSaleUntil?: Date
  sortOrder: number
  variants: Variant[]
}

/* -------------------------------------------------------------------------
   Bundles — several products at one fixed price. A bundle has no
   stock of its own: each one sold takes units from its components'
   variants, and the buyer picks the variant of each component.
   ------------------------------------------------------------------------- */

export interface BundleComponent {
  productId: string
  /** Units of the picked variant in one bundle. */
  qty: number
}

export interface Bundle {
  id: string
  campaignId: string
  name: string
  description: string
  /** Storage path, served through /media. */
  imagePath?: string
  priceFen: number
  /** Hidden from the catalog and the kasir when false. */
  active: boolean
  sortOrder: number
  /** In the order the buyer picks them. Two may name the same product, for two sizes of one shirt. */
  components: BundleComponent[]
}

/* -------------------------------------------------------------------------
   Orders
   ------------------------------------------------------------------------- */

export const CHANNELS = ["online", "walkin"] as const
export type Channel = (typeof CHANNELS)[number]

/*
 * pending_payment ──proof──▶ awaiting_verification ──approve──▶ paid ──scan or delivered──▶ picked_up
 *        ▲                          │
 *        └────────reject────────────┘
 * pending_payment past its deadline → expired. Any open order → canceled.
 * Walk-in sales are created as picked_up. A delivered delivery order is picked_up too.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "awaiting_verification",
  "paid",
  "picked_up",
  "expired",
  "cancelled",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Statuses whose units still count against stock. */
export const HOLDING_STATUSES: readonly OrderStatus[] = [
  "pending_payment",
  "awaiting_verification",
  "paid",
  "picked_up",
]

/** The buyer of an online order, copied from their account when it was made. */
export interface Buyer {
  /** The account's id; empty on orders from before accounts. */
  uid: string
  email: string
  name: string
  wechatId: string
  phone: string
}

/**
 * A buyer's account details: the PPITSZ account's profile, accounts/{uid},
 * shared by every app (@ppitsz/accounts/profile). The email is the sign-in.
 * WeChat ID and phone are "" until filled in; checkout asks for them.
 */
export type { Profile as BuyerProfile } from "@ppitsz/accounts/profile"

/** A line in an order, with names and prices copied at the time of ordering. */
export type OrderItem = ProductItem | BundleItem

interface ItemBase {
  name: string
  /** The variant, or what a bundle holds: "Kaos SZ Cup 2027 M + Gantungan Kunci". */
  variantLabel: string
  priceFen: number
  qty: number
  /** A bundle is handed over as one unit. */
  pickedUp: boolean
}

export interface ProductItem extends ItemBase {
  productId: string
  variantId: string
}

export interface BundleItem extends ItemBase {
  bundleId: string
  /** What one bundle took from stock. */
  contents: BundleUnit[]
}

/** The units of one variant inside one bundle. */
export interface BundleUnit {
  productId: string
  variantId: string
  name: string
  variantLabel: string
  qty: number
}

/** The latest proof, or how a walk-in sale was paid. */
export interface Payment {
  method?: PaymentMethod
  accountId?: string
  proofPath?: string
  submittedAt?: Date
  /** When an admin approved the proof, or when the walk-in sale was made. */
  verifiedAt?: Date
  /** Staff uid. */
  verifiedBy?: string
}

/** An admin's verdict that a proof was wrong. The buyer reads the reason. */
export interface Rejection {
  reason: string
  at: Date
  /** Staff uid. */
  by: string
  /** The rejected proof, kept for the record. */
  proofPath?: string
}

/**
 * How a delivery order reaches the buyer. An online order without one is
 * Pickup. The fee is part of the order's total.
 */
export interface Delivery {
  /** As the buyer typed it. */
  address: string
  /** A copy of the slot the buyer picked. */
  slot: DeliverySlot
  feeFen: number
  /** Set when staff hand it to a courier: "SF Express". */
  courier?: string
  trackingNumber?: string
  sentAt?: Date
  /** Staff uid. */
  sentBy?: string
}

/** Money Danus sent back for a canceled or expired online order, recorded by an admin. */
export interface Refund {
  amountFen: number
  /** How the money went back. */
  method: PaymentMethod
  /** "To the buyer's WeChat, ref 4200…" */
  note: string
  at: Date
  /** Staff uid. */
  by: string
}

export interface Order {
  id: string
  /** Short code for transfer notes and manual lookup: "GC-7K3P". */
  code: string
  /** Secret in the buyer's link and QR. Whoever holds it can view the order. */
  token: string
  campaignId: string
  channel: Channel
  /** Null for walk-in sales. */
  buyer: Buyer | null
  items: OrderItem[]
  /** The items, plus the delivery fee of a delivery order. */
  totalFen: number
  /** delivery orders only. */
  delivery?: Delivery
  status: OrderStatus
  payment: Payment
  /** Every rejected proof, oldest first. */
  rejections: Rejection[]
  createdAt: Date
  /** Deadline for payment proof while pending_payment. */
  expiresAt: Date | null
  pickedUpAt: Date | null
  /** Staff uid who handed over the last item, delivered the order, or made the walk-in sale. */
  handledBy: string | null
  cancelReason?: string
  /** Staff uid who canceled the order. */
  cancelledBy?: string
  cancelledAt?: Date
  refund?: Refund
  /** Hash of the ordering device's cookie, for the unpaid-orders limit. */
  deviceKey?: string
}

/** What a buyer or kasir asks for: a variant, or a bundle with a variant picked per component. */
export type CartLine = ProductLine | BundleLine

export interface ProductLine {
  productId: string
  variantId: string
  qty: number
}

export interface BundleLine {
  bundleId: string
  /** The variant id picked for each of the bundle's components, in order. */
  picks: string[]
  qty: number
}
