import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"

import { openRejection } from "./domain/order"
import type { Order } from "./domain/types"

/*
 * What we send a buyer over WeChat. Buyers have no account and the app
 * can't message them, so staff copy this text and paste it to the buyer.
 */

export interface BuyerMessage {
  name: string
  wechatId: string
  text: string
}

/** Tells the buyer why their proof was rejected and how to send a new one. Null when nothing is open. */
export function rejectionMessage(order: Order, orderUrl: string): BuyerMessage | null {
  const rejection = openRejection(order)
  if (!rejection || !order.buyer) return null
  const deadline = order.expiresAt
    ? ` before ${formatDate(order.expiresAt)} at ${formatTime(order.expiresAt)} Shenzhen time`
    : ""
  const lines = [
    `Hi ${order.buyer.name}, this is PPIT Shenzhen.`,
    `We couldn't accept the transfer proof for order ${order.code}: ${rejection.reason}.`,
    `The total due is ${formatYuan(order.totalFen)}, with ${order.code} in the transfer note. Send the right proof${deadline} through this link:`,
    orderUrl,
    "If the deadline passes, the order is canceled automatically. Thank you!",
  ]
  return { name: order.buyer.name, wechatId: order.buyer.wechatId, text: lines.join("\n") }
}

/** Tells the buyer their delivery order went out with a courier, and its tracking number. Null until it has. */
export function courierMessage(order: Order, orderUrl: string): BuyerMessage | null {
  const delivery = order.delivery
  if (!delivery?.sentAt || order.status !== "paid" || !order.buyer) return null
  const lines = [
    `Hi ${order.buyer.name}, this is PPIT Shenzhen.`,
    `Your order ${order.code} is on its way with ${delivery.courier}, tracking number ${delivery.trackingNumber}.`,
    "Your order details are at this link:",
    orderUrl,
    "Thank you!",
  ]
  return { name: order.buyer.name, wechatId: order.buyer.wechatId, text: lines.join("\n") }
}
