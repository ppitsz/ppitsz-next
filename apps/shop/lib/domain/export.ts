import { STATUSES } from "@ppitsz/ui/lib/network"

import { toShenzhenInput } from "../shenzhen-time"
import { displayStatus, FULFILLMENT_LABELS, fulfillmentOf } from "./delivery"
import { isBundleItem, itemNicknames } from "./order"
import type { Recap } from "./recap"
import type { Campaign, Order, PaymentMethod } from "./types"

/*
 * The recap as CSV files for Excel, WPS or Google Sheets. UTF-8 with a BOM,
 * so Excel reads Indonesian and Chinese names; amounts in yuan with a dot;
 * times in Shenzhen time.
 */

type Cell = string | number | null | undefined

/**
 * Quotes every cell. Text starting with = + - @ gets a ' first, so a buyer's
 * name can't run as a formula; a phone number such as +86 138… can't, and is left alone.
 */
export function toCsv(rows: Cell[][]) {
  const cell = (value: Cell) => {
    if (value === null || value === undefined) return '""'
    let text = String(value)
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text)) {
      text = `'${text}`
    }
    return `"${text.replaceAll('"', '""')}"`
  }
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
}

const yuan = (fen: number) => (fen / 100).toFixed(2)
const time = (date: Date | null | undefined) => (date ? toShenzhenInput(date).replace("T", " ") : "")

/** One row per item of every order: the raw data, for filters and pivot tables. */
export function ordersCsv(
  campaign: Campaign,
  orders: Order[],
  methodLabels: Record<PaymentMethod, string>,
  staffName: (uid: string | null | undefined) => string
) {
  const accountOf = (order: Order) =>
    campaign.paymentAccounts.find((a) => a.id === order.payment.accountId)?.holder ?? ""
  const rows: Cell[][] = [
    [
      "Code",
      "Created",
      "Fulfillment",
      "Status",
      "Name",
      "WeChat",
      "Phone",
      "Email",
      "Item",
      "Variant or bundle contents",
      "Custom names",
      "Qty",
      "Unit price (¥)",
      "Subtotal (¥)",
      "Handed over",
      "Order total (¥)",
      "Paid via",
      "Account",
      "Verified",
      "Verified by",
      "Canceled",
      "Cancel reason",
      "Refunded (¥)",
      "Refunded via",
      "Refund note",
      "Delivery fee (¥)",
      "Address",
      "Delivery slot",
      "Courier",
      "Tracking number",
      "Delivered",
      "Pickup point",
    ],
  ]
  for (const order of [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    order.items.forEach((item, i) => {
      rows.push([
        order.code,
        time(order.createdAt),
        FULFILLMENT_LABELS[fulfillmentOf(order)],
        STATUSES.order[displayStatus(order)].label,
        order.buyer?.name,
        order.buyer?.wechatId,
        order.buyer?.phone,
        order.buyer?.email,
        isBundleItem(item) ? `Bundle: ${item.name}` : item.name,
        item.variantLabel,
        itemNicknames(item).join(", "),
        item.qty,
        yuan(item.priceFen),
        yuan(item.priceFen * item.qty),
        item.pickedUp ? "Yes" : "No",
        // Order-level cells once per order, so a sum over the column counts each order once.
        i === 0 ? yuan(order.totalFen) : "",
        i === 0 && order.payment.method ? methodLabels[order.payment.method] : "",
        i === 0 ? accountOf(order) : "",
        i === 0 ? time(order.payment.verifiedAt) : "",
        i === 0 && order.payment.verifiedAt ? staffName(order.payment.verifiedBy) : "",
        i === 0 ? time(order.cancelledAt) : "",
        i === 0 ? order.cancelReason : "",
        i === 0 && order.refund ? yuan(order.refund.amountFen) : "",
        i === 0 && order.refund ? methodLabels[order.refund.method] : "",
        i === 0 ? order.refund?.note : "",
        i === 0 && order.delivery ? yuan(order.delivery.feeFen) : "",
        i === 0 ? order.delivery?.address : "",
        i === 0 && order.delivery ? `${time(order.delivery.slot.startsAt)}–${time(order.delivery.slot.endsAt).slice(11)}` : "",
        i === 0 ? order.delivery?.courier : "",
        i === 0 ? order.delivery?.trackingNumber : "",
        i === 0 && order.delivery && order.status === "picked_up" ? time(order.pickedUpAt) : "",
        i === 0 && order.pickupPoint
          ? `${order.pickupPoint.place}, ${time(order.pickupPoint.startsAt)}–${time(order.pickupPoint.endsAt).slice(11)}`
          : "",
      ])
    })
  }
  return toCsv(rows)
}

/** Per variant and per bundle: units sold, revenue, hand-over and what is left. */
export function productsCsv(recap: Recap) {
  const rows: Cell[][] = [
    [
      "Type",
      "Name",
      "Variant",
      "Sold online",
      "Sold at booth",
      "In bundles",
      "Revenue (¥)",
      "Handed over",
      "Not picked up",
      "Not paid",
      "Stock",
      "Left",
    ],
  ]
  for (const line of recap.lines.filter((l) => l.kind === "bundle")) {
    rows.push(["Bundle", line.name, "", line.qty.online, line.qty.walkin, "", yuan(line.fen), "", "", "", "", ""])
  }
  const lineOf = new Map(recap.lines.map((l) => [l.key, l]))
  for (const u of recap.units) {
    rows.push([
      "Product",
      u.name,
      u.variantLabel,
      u.sold.online,
      u.sold.walkin,
      u.inBundles,
      // Revenue from the variant sold on its own; units in bundles earn the bundle's price.
      yuan(lineOf.get(`p:${u.key}`)?.fen ?? 0),
      u.handedOver,
      u.toCollect,
      u.unpaid,
      u.stock ?? "",
      u.left ?? "",
    ])
  }
  return toCsv(rows)
}

/** "ppitsz-shop-sz-cup-2027-orders-2027-03-17.csv" */
export function csvFileName(campaign: Campaign, kind: string, now: Date) {
  const slug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign"
  return `ppitsz-shop-${slug}-${kind}-${toShenzhenInput(now).slice(0, 10)}.csv`
}
