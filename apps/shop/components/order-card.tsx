import NextLink from "next/link"
import { MapPinIcon } from "@phosphor-icons/react/ssr"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatYuan } from "@ppitsz/ui/lib/format"
import { slotLabel } from "@/lib/campaign-copy"
import { displayStatus } from "@/lib/domain/delivery"
import { customNamesLabel, DELIVERY_ROUTE, ORDER_ROUTE, routeStage } from "@/lib/domain/order"
import type { Campaign, Order } from "@/lib/domain/types"
import { orderPath } from "@/lib/order-path"
import { TestBadge } from "./test-badge"

/*
 * One of a buyer's orders, as a card: where it is on its route, what it
 * holds, where it goes, and the one thing to do next. Used on the homepage
 * and in Your orders.
 */

const SHOWN_ITEMS = 3

export function OrderCard({ order, campaign }: { order: Order; campaign: Pick<Campaign, "name" | "pickupInfo"> | undefined }) {
  const status = displayStatus(order)
  const more = order.items.length - SHOWN_ITEMS

  return (
    <article className="flex flex-col gap-5 rounded-xl border bg-bg p-5" aria-labelledby={`order-${order.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={`order-${order.id}`} className="flex flex-wrap items-center gap-3 type-heading-md text-text">
            Order <StationCode code={order.code} line="danus" />
          </h3>
          <p className="type-caption text-muted">
            {campaign?.name ?? "Campaign"} · {formatDate(order.createdAt)} · {formatYuan(order.totalFen)}
          </p>
        </div>
        <span className="flex flex-wrap gap-2">
          {order.test && <TestBadge />}
          <StatusBadge domain="order" value={status} />
        </span>
      </header>

      <OrderRoute order={order} />

      <ul className="flex flex-col gap-1">
        {order.items.slice(0, SHOWN_ITEMS).map((item, i) => (
          <li key={i} className="type-body-sm text-text">
            {item.qty} × {item.name}
            {item.variantLabel && <span className="text-muted"> · {item.variantLabel}</span>}
            {customNamesLabel(item) && <span className="text-muted"> · {customNamesLabel(item)}</span>}
          </li>
        ))}
        {more > 0 && <li className="type-caption text-muted">and {more} more {more === 1 ? "item" : "items"}</li>}
      </ul>

      {order.status !== "cancelled" && order.status !== "expired" && (
        <p className="flex items-start gap-2 border-t pt-4 type-body-sm text-text">
          <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          {order.delivery
            ? `Delivery ${slotLabel(order.delivery.slot)} to ${order.delivery.address}`
            : `Pick up at ${campaign?.pickupInfo || "the pickup place"}`}
        </p>
      )}

      <NextLink href={orderPath(order.token)} className={buttonVariants({ className: "self-start" })}>
        {nextStep(order)}
      </NextLink>
    </article>
  )
}

/** The button's words: what the buyer does next on the order's page. */
function nextStep(order: Order) {
  if (order.status === "pending_payment") return "Pay and upload proof"
  if (order.status === "paid" && !order.delivery) return "Show QR code"
  if (order.delivery?.trackingNumber && order.status === "paid") return "See tracking number"
  return "See order"
}

/** Order › Pay › Verify › Pick up (or Delivery) as a strip map, with the order's place on it. */
function OrderRoute({ order }: { order: Order }) {
  const stage = routeStage(order.status)
  if (stage === null) return null
  const labels = order.delivery ? DELIVERY_ROUTE : ORDER_ROUTE
  return (
    <StripMap
      line="danus"
      stops={labels.map((label) => ({ label }))}
      current={stage}
      state={order.status === "picked_up" ? "arrived" : "running"}
      aria-label="Order progress"
    />
  )
}
