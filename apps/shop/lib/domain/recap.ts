import { fulfillmentOf, type Fulfillment } from "./delivery"
import { awaitsRefund, isBundleItem, itemNicknames, refundDue } from "./order"
import { availability } from "./stock"
import type { Bundle, Campaign, Channel, Order, OrderItem, PaymentMethod, Product } from "./types"

/*
 * The sales recap: money, what was sold, and the stock behind it, from a
 * campaign's orders and products. Pure, so the recap page, the CSV export
 * and the tests all count the same way.
 *
 * A sold order is a paid online order or a walk-in sale, collected or not. A
 * canceled walk-in sale was a register mistake undone on the spot, so it
 * counts for nothing. A canceled online order counts only for the money that
 * came in and went back. Delivery fees are part of sales but not of any line.
 */

export function isSold(order: Order) {
  return order.status === "paid" || order.status === "picked_up"
}

/** What came in for an order that isn't sold: a canceled online order's verified payment, or what was refunded. */
function receivedUnsold(order: Order) {
  if (order.channel !== "online") return 0
  if (order.payment.verifiedAt) return order.totalFen
  return order.refund?.amountFen ?? 0
}

export interface RecapMoney {
  /** Paid online orders and walk-in sales. */
  salesFen: number
  salesByChannel: Record<Channel, number>
  /** Of `salesFen`, the delivery fees of sold delivery orders. */
  deliveryFeesFen: number
  /** Everything that came in: sales, plus canceled online orders that were paid. */
  receivedFen: number
  refundedFen: number
  /** What we should hold now: received minus refunded. */
  heldFen: number
  /** Canceled online orders still waiting for their money back. */
  owedFen: number
  owedOrders: number
  /** Proofs not checked yet. */
  awaitingFen: number
  awaitingOrders: number
  /** Online orders waiting for a transfer. */
  unpaidFen: number
  unpaidOrders: number
}

/** Money per payment account, to check against each account's statement. */
export interface RecapAccount {
  key: string
  method: PaymentMethod
  /** "WeChat Pay · Nadia (Treasurer)", or "Cash". */
  label: string
  orders: number
  receivedFen: number
}

/** A product variant or a bundle, as sold. */
export interface RecapLine {
  key: string
  kind: "product" | "bundle"
  name: string
  /** The variant; empty for a bundle and a product without options. */
  variantLabel: string
  qty: Record<Channel, number>
  fen: number
}

/** One variant's units: what sold orders took, including inside bundles, and what is left. */
export interface RecapUnits {
  key: string
  name: string
  variantLabel: string
  sold: Record<Channel, number>
  /** Of `sold`, units inside bundles. */
  inBundles: number
  handedOver: number
  /** Sold, not handed over yet. */
  toCollect: number
  /** Held by orders not paid or not checked yet. */
  unpaid: number
  stock: number | null
  /** Left to sell at all, from the product's counters; null for a product that no longer exists. */
  left: number | null
}

export interface Recap {
  money: RecapMoney
  accounts: RecapAccount[]
  refundsByMethod: { method: PaymentMethod; fen: number; orders: number }[]
  lines: RecapLine[]
  units: RecapUnits[]
  /** Sold orders by how they reach the buyer. */
  ordersByFulfillment: Record<Fulfillment, number>
  /** Paid pickup orders with items still to hand over. */
  toCollectOrders: number
  /** Paid delivery orders not delivered yet. */
  toDeliverOrders: number
}

const zero = (): Record<Channel, number> => ({ online: 0, walkin: 0 })

export function buildRecap(
  campaign: Campaign,
  orders: Order[],
  products: Product[],
  bundles: Bundle[],
  methodLabels: Record<PaymentMethod, string>
): Recap {
  const money: RecapMoney = {
    salesFen: 0,
    salesByChannel: zero(),
    deliveryFeesFen: 0,
    receivedFen: 0,
    refundedFen: 0,
    heldFen: 0,
    owedFen: 0,
    owedOrders: 0,
    awaitingFen: 0,
    awaitingOrders: 0,
    unpaidFen: 0,
    unpaidOrders: 0,
  }
  const accounts = new Map<string, RecapAccount>()
  const refunds = new Map<PaymentMethod, { method: PaymentMethod; fen: number; orders: number }>()
  const lines = new Map<string, RecapLine>()
  const units = new Map<string, RecapUnits>()
  let toCollectOrders = 0
  let toDeliverOrders = 0
  const ordersByFulfillment: Record<Fulfillment, number> = { delivery: 0, pickup: 0, booth: 0 }

  const unitsOf = (productId: string, variantId: string, name: string, variantLabel: string) => {
    const key = `${productId}/${variantId}`
    let row = units.get(key)
    if (!row) {
      row = { key, name, variantLabel, sold: zero(), inBundles: 0, handedOver: 0, toCollect: 0, unpaid: 0, stock: null, left: null }
      units.set(key, row)
    }
    return row
  }

  const addReceived = (order: Order, fen: number) => {
    if (fen === 0) return
    money.receivedFen += fen
    const method = order.payment.method ?? "cash"
    const key = `${method}:${order.payment.accountId ?? ""}`
    let account = accounts.get(key)
    if (!account) {
      const found = campaign.paymentAccounts.find((a) => a.id === order.payment.accountId)
      const label = found ? `${methodLabels[method]} · ${found.holder}` : methodLabels[method]
      account = { key, method, label, orders: 0, receivedFen: 0 }
      accounts.set(key, account)
    }
    account.orders++
    account.receivedFen += fen
  }

  for (const order of orders) {
    if (order.refund) {
      money.refundedFen += order.refund.amountFen
      const r = refunds.get(order.refund.method) ?? { method: order.refund.method, fen: 0, orders: 0 }
      r.fen += order.refund.amountFen
      r.orders++
      refunds.set(order.refund.method, r)
    }
    if (awaitsRefund(order)) {
      money.owedFen += refundDue(order)
      money.owedOrders++
    }

    if (order.status === "awaiting_verification" || order.status === "pending_payment") {
      if (order.status === "awaiting_verification") {
        money.awaitingFen += order.totalFen
        money.awaitingOrders++
      } else {
        money.unpaidFen += order.totalFen
        money.unpaidOrders++
      }
      for (const unit of itemUnits(order.items)) unitsOf(unit.productId, unit.variantId, unit.name, unit.variantLabel).unpaid += unit.qty
      continue
    }

    if (!isSold(order)) {
      addReceived(order, receivedUnsold(order))
      continue
    }

    money.salesFen += order.totalFen
    money.salesByChannel[order.channel] += order.totalFen
    money.deliveryFeesFen += order.delivery?.feeFen ?? 0
    addReceived(order, order.totalFen)
    ordersByFulfillment[fulfillmentOf(order)]++
    if (order.status === "paid") {
      if (order.delivery) toDeliverOrders++
      else toCollectOrders++
    }

    for (const item of order.items) {
      const key = isBundleItem(item) ? `b:${item.bundleId}` : `p:${item.productId}/${item.variantId}`
      let line = lines.get(key)
      if (!line) {
        line = {
          key,
          kind: isBundleItem(item) ? "bundle" : "product",
          name: item.name,
          variantLabel: isBundleItem(item) ? "" : item.variantLabel,
          qty: zero(),
          fen: 0,
        }
        lines.set(key, line)
      }
      line.qty[order.channel] += item.qty
      line.fen += item.qty * item.priceFen
    }
    for (const unit of itemUnits(order.items)) {
      const row = unitsOf(unit.productId, unit.variantId, unit.name, unit.variantLabel)
      row.sold[order.channel] += unit.qty
      if (unit.inBundle) row.inBundles += unit.qty
      if (unit.pickedUp) row.handedOver += unit.qty
      else row.toCollect += unit.qty
    }
  }
  money.heldFen = money.receivedFen - money.refundedFen

  // Every variant of the campaign gets a row, sold or not, in catalog order.
  const productOrder = new Map<string, number>()
  products
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .forEach((product, p) =>
      product.variants.forEach((variant, v) => {
        const row = unitsOf(product.id, variant.id, product.name, variant.label)
        row.name = product.name
        row.variantLabel = variant.label
        row.stock = variant.stock
        row.left = availability(variant).remaining
        productOrder.set(`p:${row.key}`, p * 100 + v)
      })
    )
  const bundleOrder = new Map(bundles.map((b) => [`b:${b.id}`, b.sortOrder]))
  const rank = (key: string) => productOrder.get(key) ?? Number.MAX_SAFE_INTEGER

  return {
    money,
    accounts: [...accounts.values()].sort((a, b) => b.receivedFen - a.receivedFen),
    refundsByMethod: [...refunds.values()],
    lines: [...lines.values()].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "bundle" ? -1 : 1
      if (a.kind === "bundle") return (bundleOrder.get(a.key) ?? 999) - (bundleOrder.get(b.key) ?? 999) || a.name.localeCompare(b.name)
      return rank(a.key) - rank(b.key) || a.name.localeCompare(b.name)
    }),
    units: [...units.values()].sort((a, b) => rank(`p:${a.key}`) - rank(`p:${b.key}`) || a.name.localeCompare(b.name)),
    ordersByFulfillment,
    toCollectOrders,
    toDeliverOrders,
  }
}

/** Every variant unit in `items` with the names copied at ordering time, bundles expanded. */
function itemUnits(items: OrderItem[]) {
  return items.flatMap((item) =>
    isBundleItem(item)
      ? item.contents.map((u) => ({ ...u, qty: u.qty * item.qty, pickedUp: item.pickedUp, inBundle: true }))
      : [{ ...item, inBundle: false }]
  )
}

/* -------------------------------------------------------------------------
   The pickup list: the paper backup for the booth
   ------------------------------------------------------------------------- */

export interface PickupEntry {
  orderId: string
  campaignId: string
  code: string
  name: string
  wechatId: string
  /** "2× Kaos SZ Cup 2027 · M – nickname: Budi, Ani" per item still to hand over. */
  items: string[]
}

/**
 * Paid pickup orders with items still to hand over, by buyer name:
 * what to look up when the internet fails. delivery orders are on the delivery list.
 */
export function pickupList(orders: Order[]): PickupEntry[] {
  return orders
    .filter((o) => o.status === "paid" && o.buyer && !o.delivery)
    .map((o) => ({
      orderId: o.id,
      campaignId: o.campaignId,
      code: o.code,
      name: o.buyer!.name,
      wechatId: o.buyer!.wechatId,
      items: o.items
        .filter((i) => !i.pickedUp)
        .map((i) => {
          const nicknames = itemNicknames(i)
          return `${i.qty}× ${i.name}${i.variantLabel ? ` · ${i.variantLabel}` : ""}${nicknames.length ? ` – nickname: ${nicknames.join(", ")}` : ""}`
        }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }) || a.code.localeCompare(b.code))
}
