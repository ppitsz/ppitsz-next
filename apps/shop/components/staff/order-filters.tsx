"use client"

import { usePathname, useRouter } from "next/navigation"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { Input } from "@ppitsz/ui/components/input"
import { FilterChip, FilterChipGroup } from "@ppitsz/ui/components/toggle"
import { STATUSES } from "@ppitsz/ui/lib/network"
import { FULFILLMENT_LABELS, FULFILLMENTS, type Fulfillment } from "@/lib/domain/delivery"
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain/types"

/** Campaign, fulfillment and status chips, and search. All live in the URL, so a filtered list can be shared. */
export function OrderFilters({
  status,
  campaignId,
  way,
  wayCounts,
  q,
  counts,
  total,
  campaigns,
}: {
  status: OrderStatus | null
  campaignId: string | null
  /** Delivery, Pickup or Booth; null for all. */
  way: Fulfillment | null
  /** Per fulfillment, within the chosen campaign. */
  wayCounts: Record<Fulfillment, number>
  q: string
  /** Per status, within the chosen campaign. */
  counts: Record<OrderStatus, number>
  total: number
  /** Campaigns with orders, and how many each has. */
  campaigns: { id: string; name: string; count: number }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  function show(next: { status?: OrderStatus | null; campaignId?: string | null; way?: Fulfillment | null }) {
    const params = new URLSearchParams()
    const nextCampaign = next.campaignId === undefined ? campaignId : next.campaignId
    const nextStatus = next.status === undefined ? status : next.status
    const nextWay = next.way === undefined ? way : next.way
    if (nextCampaign) params.set("campaign", nextCampaign)
    if (nextWay) params.set("cara", nextWay)
    if (nextStatus) params.set("status", nextStatus)
    if (q) params.set("q", q)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* A plain GET form: search works even before the page's JavaScript loads. */}
      <form method="get" role="search" className="flex max-w-xl gap-2">
        {campaignId && <input type="hidden" name="campaign" value={campaignId} />}
        {way && <input type="hidden" name="cara" value={way} />}
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="order-search" className="sr-only">
          Search code, name or WeChat ID
        </label>
        <Input
          id="order-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Code, name or WeChat ID"
        />
        <Button type="submit" className="h-12">
          <MagnifyingGlassIcon aria-hidden />
          Search
        </Button>
      </form>

      {campaigns.length > 1 && (
        <FilterChipGroup aria-label="Campaign">
          <FilterChip pressed={campaignId === null} onPressedChange={() => show({ campaignId: null })}>
            All campaigns
          </FilterChip>
          {campaigns.map((c) => (
            <FilterChip
              key={c.id}
              pressed={campaignId === c.id}
              onPressedChange={(pressed) => show({ campaignId: pressed ? c.id : null })}
            >
              {c.name} · {c.count}
            </FilterChip>
          ))}
        </FilterChipGroup>
      )}

      <FilterChipGroup aria-label="Fulfillment">
        <FilterChip pressed={way === null} onPressedChange={() => show({ way: null })}>
          All
        </FilterChip>
        {FULFILLMENTS.map((value) => (
          <FilterChip
            key={value}
            pressed={way === value}
            onPressedChange={(pressed) => show({ way: pressed ? value : null })}
          >
            {FULFILLMENT_LABELS[value]} · {wayCounts[value]}
          </FilterChip>
        ))}
      </FilterChipGroup>

      <FilterChipGroup aria-label="Order status">
        <FilterChip pressed={status === null} onPressedChange={() => show({ status: null })}>
          All · {total}
        </FilterChip>
        {ORDER_STATUSES.map((value) => (
          <FilterChip
            key={value}
            pressed={status === value}
            onPressedChange={(pressed) => show({ status: pressed ? value : null })}
          >
            {STATUSES.order[value].label} · {counts[value]}
          </FilterChip>
        ))}
      </FilterChipGroup>
    </div>
  )
}
