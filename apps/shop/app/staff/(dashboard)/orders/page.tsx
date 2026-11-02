import type { Metadata } from "next"
import Link from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { formatYuan } from "@ppitsz/ui/lib/format"
import { requireStaff } from "@/lib/server/auth"
import { displayStatus, FULFILLMENTS, fulfillmentOf, type Fulfillment } from "@/lib/domain/delivery"
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/domain/types"
import { listCampaigns, listOrders } from "@/lib/store"
import { itemsSummary, OrderStatusBadge, when } from "@/components/staff/order-bits"
import { OrderFilters } from "@/components/staff/order-filters"

export const metadata: Metadata = { title: "Orders" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

function matches(order: Order, query: string) {
  if (!query) return true
  const q = query.toLowerCase().replace(/\s+/g, " ").trim()
  const compact = q.replace(/[^0-9a-z]/g, "")
  const haystack = [order.buyer?.name, order.buyer?.wechatId, order.buyer?.phone, order.buyer?.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  // "7k3p", "gc 7k3p" and "GC-7K3P" all find GC-7K3P.
  const code = order.code.toLowerCase().replace("-", "")
  return haystack.includes(q) || (compact.length >= 3 && code.includes(compact))
}

export default async function OrdersPage({ searchParams }: PageProps<"/staff/orders">) {
  await requireStaff()
  const params = await searchParams
  const rawStatus = first(params.status)
  const status = (ORDER_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as OrderStatus)
    : null
  const q = (first(params.q) ?? "").slice(0, 60)
  const rawWay = first(params.cara)
  const way = (FULFILLMENTS as readonly string[]).includes(rawWay ?? "") ? (rawWay as Fulfillment) : null

  // Every campaign's orders, newest first; a chip narrows to one.
  const [orders, campaigns] = await Promise.all([listOrders(), listCampaigns()])
  const nameOf = new Map(campaigns.map((c) => [c.id, c.name]))
  const perCampaign = campaigns
    .map((c) => ({ id: c.id, name: c.name, count: orders.filter((o) => o.campaignId === c.id).length }))
    .filter((c) => c.count > 0)
  const rawCampaign = first(params.campaign)
  const campaignId = perCampaign.some((c) => c.id === rawCampaign) ? rawCampaign! : null
  const inCampaign = campaignId ? orders.filter((o) => o.campaignId === campaignId) : orders
  const wayCounts: Record<Fulfillment, number> = { delivery: 0, pickup: 0, booth: 0 }
  for (const order of inCampaign) wayCounts[fulfillmentOf(order)]++
  const all = way ? inCampaign.filter((o) => fulfillmentOf(o) === way) : inCampaign
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  for (const order of all) counts[order.status]++
  const shown = all.filter((o) => (!status || o.status === status) && matches(o, q))

  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">{campaignId ? nameOf.get(campaignId) : "All campaigns"}</p>
        <h1 className="type-display-xl text-text">Orders</h1>
      </div>

      <OrderFilters
        status={status}
        campaignId={campaignId}
        way={way}
        wayCounts={wayCounts}
        q={q}
        counts={counts}
        total={all.length}
        campaigns={perCampaign}
      />

      {shown.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{all.length === 0 ? "No orders yet." : "No orders match."}</EmptyTitle>
            {all.length > 0 && (
              <EmptyDescription>
                <Link href="/staff/orders">Show all orders</Link>
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="@container">
          <p className="mb-2 type-caption text-muted" aria-live="polite">
            {shown.length} {shown.length === 1 ? "order" : "orders"}
          </p>
          <ul className="flex flex-col">
            {shown.map((order) => (
              <li key={order.id} className="border-t last:border-b">
                <Link
                  href={`/staff/orders/${order.id}`}
                  className="group grid gap-1 py-4 hover:bg-surface-strong @3xl:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1.4fr)_6rem_9rem] @3xl:items-center @3xl:gap-4 @3xl:px-2"
                >
                  <span className="flex flex-col">
                    <span className="type-heading-sm text-text underline-offset-4 group-hover:underline">
                      {order.code}
                    </span>
                    <span className="type-caption text-muted">
                      {when(order.createdAt)}
                      {!campaignId && perCampaign.length > 1 && ` · ${nameOf.get(order.campaignId) ?? ""}`}
                    </span>
                  </span>
                  <span className="truncate type-body-sm text-text">
                    {order.buyer ? `${order.buyer.name} · ${order.buyer.wechatId}` : "Walk-in sale"}
                  </span>
                  <span className="truncate type-body-sm text-muted">{itemsSummary(order)}</span>
                  <span className="type-ui text-text @3xl:text-right">{formatYuan(order.totalFen)}</span>
                  <span className="@3xl:justify-self-end">
                    <OrderStatusBadge status={displayStatus(order)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  )
}
