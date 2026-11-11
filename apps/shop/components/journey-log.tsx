import NextLink from "next/link"

import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatYuan, toShenzhenIso } from "@ppitsz/ui/lib/format"
import { displayStatus } from "@/lib/domain/delivery"
import type { Campaign, Order } from "@/lib/domain/types"
import { orderPath } from "@/lib/order-path"

/*
 * Done orders as a journey log, the way a transit card lists past trips: one
 * row each, newest first. The date it ended (picked up, delivered) or was
 * placed, the code as a station number, the campaign it ran on, how it
 * ended in words, and the fare. Each row's code link is stretched over it.
 */

export function JourneyLog({ orders, campaigns }: { orders: Order[]; campaigns: Map<string, Pick<Campaign, "name">> }) {
  return (
    <ol aria-label="Past orders" className="@container flex flex-col border-t">
      {orders.map((order) => {
        const at = order.pickedUpAt ?? order.cancelledAt ?? order.createdAt
        const items = order.items.reduce((sum, item) => sum + item.qty, 0)
        return (
          <li
            key={order.id}
            className="group/row relative grid gap-x-6 gap-y-2 border-b px-3 py-4 transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus @2xl:grid-cols-[7rem_9rem_minmax(0,1fr)_auto_6rem] @2xl:items-center"
          >
            <time dateTime={toShenzhenIso(at)} className="type-sign text-muted">
              {formatDate(at)}
            </time>
            <NextLink href={orderPath(order.token)} className="justify-self-start outline-none after:absolute after:inset-0">
              <span className="sr-only">Order </span>
              <StationCode code={order.code} line="danus" />
            </NextLink>
            <p className="flex min-w-0 flex-col">
              <span className="truncate type-ui text-text group-hover/row:underline underline-offset-4">
                {campaigns.get(order.campaignId)?.name ?? "Danus campaign"}
              </span>
              <span className="type-caption text-muted">
                {items} {items === 1 ? "item" : "items"}
              </span>
            </p>
            <span className="justify-self-start">
              <StatusBadge domain="order" value={displayStatus(order)} />
            </span>
            <span className="type-ui text-text tabular-nums @2xl:text-end">{formatYuan(order.totalFen)}</span>
          </li>
        )
      })}
    </ol>
  )
}
