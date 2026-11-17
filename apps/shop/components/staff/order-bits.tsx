import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import type { ShownStatus } from "@/lib/domain/delivery"
import { itemNicknames } from "@/lib/domain/order"
import type { Campaign, Order } from "@/lib/domain/types"

/* Small pieces shared by the staff pages. */

export const when = (date: Date) => `${formatDate(date)}, ${formatTime(date)}`

/** The status as shown (displayStatus): "On its way" or "Delivered" for a delivery order. */
export function OrderStatusBadge({ status }: { status: ShownStatus }) {
  return <StatusBadge domain="order" value={status} />
}

/** "WeChat Pay · Example: Treasurer" — where the buyer says they paid. */
export function paymentDestination(order: Order, campaign: Campaign) {
  const method = order.payment.method
  if (!method) return null
  const account = campaign.paymentAccounts.find((a) => a.id === order.payment.accountId)
  return account
    ? `${PAYMENT_METHOD_LABELS[method]} · ${account.holder}`
    : PAYMENT_METHOD_LABELS[method]
}

export function itemsSummary(order: Order) {
  return order.items
    .map((i) => {
      const nicknames = itemNicknames(i)
      return `${i.qty}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}${nicknames.length ? ` – nickname: ${nicknames.join(", ")}` : ""}`
    })
    .join(", ")
}

export function ItemList({ order, showPickup = false }: { order: Order; showPickup?: boolean }) {
  return (
    <ul className="flex flex-col">
      {order.items.map((item, i) => (
        <li key={i} className="flex items-start justify-between gap-4 border-t py-2">
          <span className="flex flex-col">
            <span className="type-body-sm text-text">
              {item.qty}× {item.name}
              {item.variantLabel && ` · ${item.variantLabel}`}
            </span>
            {itemNicknames(item).length > 0 && (
              <span className="type-caption text-muted">
                {itemNicknames(item).length === 1 ? "Nickname" : "Nicknames"}: {itemNicknames(item).join(", ")}
              </span>
            )}
            {showPickup && !order.delivery && (
              <span className="type-caption text-muted">
                {item.pickedUp ? "Handed over" : "Not handed over"}
              </span>
            )}
          </span>
          <span className="type-body-sm text-text">{formatYuan(item.qty * item.priceFen)}</span>
        </li>
      ))}
      {order.delivery && (
        <li className="flex items-start justify-between gap-4 border-t py-2">
          <span className="type-body-sm text-text">Delivery fee</span>
          <span className="type-body-sm text-text">{formatYuan(order.delivery.feeFen)}</span>
        </li>
      )}
      <li className="flex items-baseline justify-between gap-4 border-t-2 border-text pt-2">
        <span className="type-ui text-text">Total</span>
        <span className="type-heading-md text-text">{formatYuan(order.totalFen)}</span>
      </li>
    </ul>
  )
}

/** The transfer screenshot, opening full size in a new tab. */
export function ProofImage({ order }: { order: Order }) {
  if (!order.payment.proofPath) {
    return <p className="type-body-sm text-muted">No proof of payment yet.</p>
  }
  const src = `/staff/proofs/${order.id}?v=${order.payment.submittedAt?.getTime() ?? 0}`
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- staff-only route, not optimisable */}
      <img
        src={src}
        alt={`Transfer proof for order ${order.code}`}
        className="max-h-[32rem] w-full rounded-xl bg-surface object-contain"
      />
      <span className="mt-2 block type-caption text-muted">Tap to open full size</span>
    </a>
  )
}
