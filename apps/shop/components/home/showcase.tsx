"use client"

import NextLink from "next/link"
import { useState } from "react"

import { Badge } from "@ppitsz/ui/components/badge"
import { FilterChip, FilterChipGroup } from "@ppitsz/ui/components/toggle"
import { formatDate, formatYuan } from "@ppitsz/ui/lib/format"
import type { Category } from "@/lib/domain/types"
import { SHOWCASE_BADGES, type ShowcaseBadge, type ShowcaseItem } from "@/lib/home"
import { Allergens } from "@/components/product-labels"
import { StockBar } from "./stock-bar"

type Filter = Category | "bundle" | null

const BADGE_VARIANTS = {
  soon: "highlight",
  low: "warning",
  sold_out: "neutral",
  booth_only: "outline",
  bundle: "outline",
} as const satisfies Record<ShowcaseBadge, string>

/** What open campaigns sell, filtered by chips. Each card opens the item on its campaign's catalog. */
export function Showcase({
  items,
  filters,
  showCampaign,
}: {
  items: ShowcaseItem[]
  filters: { id: Exclude<Filter, null>; label: string }[]
  /** With more than one open campaign, each card names its own. */
  showCampaign: boolean
}) {
  const [filter, setFilter] = useState<Filter>(null)
  const shown = items.filter((i) => filter === null || (filter === "bundle" ? i.kind === "bundle" : i.category === filter))

  return (
    <div className="@container flex flex-col gap-6">
      {filters.length > 1 && (
        <FilterChipGroup aria-label="Show">
          <FilterChip pressed={filter === null} onPressedChange={() => setFilter(null)}>
            All
          </FilterChip>
          {filters.map((f) => (
            <FilterChip key={f.id} pressed={filter === f.id} onPressedChange={() => setFilter(f.id)}>
              {f.label}
            </FilterChip>
          ))}
        </FilterChipGroup>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 @2xl:grid-cols-3 @4xl:grid-cols-4">
        {shown.map((item) => (
          <li key={item.key}>
            <ShowcaseCard item={item} showCampaign={showCampaign} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShowcaseCard({ item, showCampaign }: { item: ShowcaseItem; showCampaign: boolean }) {
  return (
    <NextLink href={item.href} className="group flex flex-col gap-3">
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-surface">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- served by /media, already sized
          <img src={item.imageUrl} alt="" className="size-full object-cover" />
        )}
        {(item.badge || item.tags.length > 0) && (
          <span className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {item.badge && <Badge variant={BADGE_VARIANTS[item.badge]}>{SHOWCASE_BADGES[item.badge]}</Badge>}
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="bg-bg">
                {tag}
              </Badge>
            ))}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="type-heading-sm text-text underline-offset-4 group-hover:underline">{item.name}</span>
          <span className="shrink-0 type-ui text-text">
            {item.priceFrom && <span className="type-caption text-muted">from </span>}
            {formatYuan(item.priceFen)}
          </span>
        </span>
        {item.detail && <span className="line-clamp-2 type-caption text-muted">{item.detail}</span>}
        {showCampaign && <span className="type-caption text-muted">{item.campaignName}</span>}
      </span>
      {item.startsAt ? (
        <span className="type-caption text-text">From {formatDate(new Date(item.startsAt))}</span>
      ) : (
        item.stock && <StockBar left={item.stock.left} total={item.stock.total} />
      )}
      <Allergens allergens={item.allergens} />
    </NextLink>
  )
}
