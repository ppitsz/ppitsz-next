import NextLink from "next/link"

import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatTime, toShenzhenIso } from "@ppitsz/ui/lib/format"
import { campaignPhase } from "@/lib/domain/campaign"
import type { Campaign } from "@/lib/domain/types"

/*
 * The open campaigns as a departure board: one row each, soonest to leave
 * first. The time column is the moment that matters now: when online
 * ordering opens, or the last order. Under a day before the last order,
 * the row says "Final call". The status badge always says the real status
 * in words; the board's words only add the urgency.
 */

const FINAL_CALL_MS = 24 * 60 * 60 * 1000

type Phase = ReturnType<typeof campaignPhase>

/** Booth first (selling now), then by last order, then by opening; closed last. */
function departureOrder(campaign: Campaign, phase: Phase) {
  const far = Number.MAX_SAFE_INTEGER
  if (phase === "booth") return [0, 0]
  if (phase === "online") return [1, campaign.onlineClosesAt?.getTime() ?? far]
  if (phase === "upcoming") return [2, campaign.onlineOpensAt?.getTime() ?? far]
  return [3, 0]
}

export function CampaignBoard({ campaigns, now }: { campaigns: Campaign[]; now: Date }) {
  const rows = campaigns
    .map((campaign) => ({ campaign, phase: campaignPhase(campaign, now) }))
    .sort((a, b) => {
      const [ga, ta] = departureOrder(a.campaign, a.phase)
      const [gb, tb] = departureOrder(b.campaign, b.phase)
      return ga! - gb! || ta! - tb!
    })

  return (
    <div className="tone-ink @container overflow-hidden rounded-xl">
      <div
        aria-hidden
        className="hidden border-b px-5 py-3 type-kicker text-muted @3xl:grid @3xl:grid-cols-[9rem_minmax(0,1fr)_14rem_10rem] @3xl:gap-6"
      >
        <span>Time</span>
        <span>Campaign</span>
        <span>Platform</span>
        <span>Status</span>
      </div>
      <ul className="flex flex-col">
        {rows.map(({ campaign, phase }) => (
          <li key={campaign.id} className="border-b last:border-b-0">
            <BoardRow campaign={campaign} phase={phase} now={now} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BoardRow({ campaign, phase, now }: { campaign: Campaign; phase: Phase; now: Date }) {
  const finalCall =
    phase === "online" &&
    !!campaign.onlineClosesAt &&
    campaign.onlineClosesAt.getTime() - now.getTime() < FINAL_CALL_MS

  return (
    <div className="group/row relative grid gap-x-6 gap-y-3 px-5 py-5 transition-colors duration-(--duration-fast) ease-out hover:bg-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus @3xl:grid-cols-[9rem_minmax(0,1fr)_14rem_10rem] @3xl:items-center">
      <TimeCell campaign={campaign} phase={phase} />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="type-heading-md text-text">
          <NextLink
            href={`/${campaign.slug}`}
            className="outline-none after:absolute after:inset-0 underline-offset-4 group-hover/row:underline"
          >
            {campaign.name}
          </NextLink>
        </h3>
        {campaign.tagline && <p className="type-body-sm text-muted">{campaign.tagline}</p>}
      </div>
      <p className="flex flex-col gap-0.5">
        <span className="type-kicker text-muted @3xl:hidden">Platform</span>
        <span className="type-sign text-text">{platform(campaign)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:flex-col @3xl:items-start">
        {finalCall && <span className="type-kicker text-accent-text">Final call</span>}
        <StatusBadge domain="campaign" value={phase} />
      </div>
    </div>
  )
}

function TimeCell({ campaign, phase }: { campaign: Campaign; phase: Phase }) {
  const [label, date] =
    phase === "upcoming"
      ? ["Opens", campaign.onlineOpensAt]
      : phase === "online"
        ? ["Last order", campaign.onlineClosesAt]
        : phase === "booth"
          ? ["At the booth", null]
          : ["Closed", null]
  return (
    <p className="flex flex-col gap-0.5">
      <span className="type-kicker text-muted">{label}</span>
      {date ? (
        <>
          <time dateTime={toShenzhenIso(date)} className="type-heading-lg text-text tabular-nums">
            {formatTime(date)}
          </time>
          <span className="type-caption text-muted">{formatDate(date)}</span>
        </>
      ) : (
        <span className="type-heading-lg text-text">
          {phase === "booth" ? "Now" : phase === "online" ? "Any time" : "–"}
        </span>
      )}
    </p>
  )
}

/** Where the order comes in: the pickup place, delivery, or both. */
function platform(campaign: Campaign) {
  const { delivery, pickup, booth } = campaign.offers
  if (pickup && delivery) return `${campaign.pickupInfo || "Pickup"} · or delivered`
  if (pickup || booth) return campaign.pickupInfo || "Our booth"
  return "Delivered to you"
}
