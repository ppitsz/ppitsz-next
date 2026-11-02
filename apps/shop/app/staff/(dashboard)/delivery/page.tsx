import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { Link } from "@ppitsz/ui/components/link"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { slotLabel } from "@/lib/campaign-copy"
import { deliveryList, displayStatus } from "@/lib/domain/delivery"
import { requireStaff } from "@/lib/server/auth"
import { listAwaitingDelivery, listCampaigns } from "@/lib/store"
import { DeliveryActions } from "@/components/staff/delivery-actions"
import { itemsSummary, OrderStatusBadge } from "@/components/staff/order-bits"

export const metadata: Metadata = { title: "Delivery" }

/** Paid delivery orders of every campaign, by slot: who gets what, where, and when. */
export default async function DeliveryPage() {
  await requireStaff()
  const [orders, campaigns] = await Promise.all([listAwaitingDelivery(), listCampaigns()])
  const nameOf = new Map(campaigns.map((c) => [c.id, c.name]))
  const groups = deliveryList(orders)

  return (
    <Container className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">All campaigns</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="type-display-lg text-text">Delivery</h1>
          {groups.length > 0 && (
            <Link as={NextLink} href="/staff/print/delivery" variant="standalone">
              Print delivery list
            </Link>
          )}
        </div>
        <p className="max-w-[66ch] type-body text-muted">
          Paid delivery orders, by slot. Deliver them yourself and mark them delivered, or send them by courier and
          record the tracking number.
        </p>
      </div>

      {groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No orders waiting for delivery.</EmptyTitle>
            <EmptyDescription>Delivery orders show up here once their payment is approved.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map(({ slot, orders: inSlot }) => (
          <section
            key={`${slot.id}-${slot.startsAt.getTime()}`}
            aria-labelledby={`slot-${slot.id}`}
            className="@container flex flex-col gap-2"
          >
            <h2 id={`slot-${slot.id}`} className="type-heading-lg text-text">
              {slotLabel(slot)} · {formatNumber(inSlot.length)} {inSlot.length === 1 ? "order" : "orders"}
            </h2>
            <ul className="flex flex-col">
              {inSlot.map((order) => (
                <li key={order.id} className="grid gap-3 border-t py-4 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:items-start">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link as={NextLink} href={`/staff/orders/${order.id}`} variant="standalone">
                        {order.code}
                      </Link>
                      <OrderStatusBadge status={displayStatus(order)} />
                      <span className="type-caption text-muted">{nameOf.get(order.campaignId)}</span>
                    </div>
                    <p className="type-body text-text">
                      {order.buyer?.name} · HP {order.buyer?.phone} · WeChat {order.buyer?.wechatId}
                    </p>
                    <p className="type-body text-text">{order.delivery!.address}</p>
                    <p className="type-body-sm text-muted">{itemsSummary(order)}</p>
                    {order.delivery!.sentAt && (
                      <p className="type-body-sm text-muted">
                        {order.delivery!.courier} · tracking {order.delivery!.trackingNumber}
                      </p>
                    )}
                  </div>
                  <DeliveryActions
                    orderId={order.id}
                    code={order.code}
                    courier={
                      order.delivery!.sentAt
                        ? { name: order.delivery!.courier ?? "", trackingNumber: order.delivery!.trackingNumber ?? "" }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Container>
  )
}
