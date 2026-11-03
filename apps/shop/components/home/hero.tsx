import NextLink from "next/link"

import { Badge } from "@ppitsz/ui/components/badge"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatTime, formatYuan, toShenzhenIso } from "@ppitsz/ui/lib/format"
import { mediaUrl } from "@/lib/catalog"
import { campaignPhase } from "@/lib/domain/campaign"
import type { Campaign } from "@/lib/domain/types"
import { daysUntil, type Featured } from "@/lib/home"
import { Allergens } from "@/components/product-labels"
import { StockBar } from "./stock-bar"

/*
 * The homepage hero: a dark band for the first open campaign, like the
 * departures board at a station entrance. The Danus line across the top,
 * the line badge and status (with "Final call" in the last day of online
 * ordering), the name, then its facts as board cells: the time that matters
 * now big, how orders arrive, the fee or the place. Beside it, the featured
 * product (or the cover photo).
 */

const FINAL_CALL_MS = 24 * 60 * 60 * 1000

export function Hero({ campaign, featured, now }: { campaign: Campaign; featured: Featured | null; now: Date }) {
  const phase = campaignPhase(campaign, now)
  const days = phase === "online" ? daysUntil(campaign.onlineClosesAt, now) : null
  const coverUrl = campaign.coverImagePath ? mediaUrl(campaign.coverImagePath) : undefined
  // The largest size fits about eight letters a word beside the card; a longer word would break mid-word.
  const longestWord = Math.max(...campaign.name.split(/\s+/).map((word) => word.length))
  const titleClass = longestWord > 8 ? "type-display-xl text-text" : "type-display-2xl text-text"
  const finalCall =
    phase === "online" &&
    !!campaign.onlineClosesAt &&
    campaign.onlineClosesAt.getTime() - now.getTime() < FINAL_CALL_MS

  return (
    <section aria-labelledby="lead-campaign" className="tone-ink">
      <Container data-line="danus" className="@container grid gap-10 py-12 lg:py-20">
        <span aria-hidden className="route" />
        <div className="grid items-center gap-10 @4xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <LineBadge code="danus" />
              <StatusBadge domain="campaign" value={phase} />
              {finalCall && <span className="type-kicker text-accent-text">Final call</span>}
            </div>
            <h1 id="lead-campaign" className={titleClass}>
              {campaign.name}
            </h1>
            {campaign.tagline && <p className="max-w-[56ch] type-lede text-muted">{campaign.tagline}</p>}
            <Facts campaign={campaign} phase={phase} />
            <div className="flex flex-wrap items-center gap-4">
              <NextLink href={`/${campaign.slug}`} className={buttonVariants({ variant: "primary", size: "lg" })}>
                See the catalog
              </NextLink>
              {days !== null && (
                <span className="type-ui text-muted">
                  {days === 1 ? "Online ordering closes tomorrow" : `Closes in ${days} days`}
                </span>
              )}
            </div>
          </div>
          {featured ? (
            <FeaturedCard featured={featured} closesAt={phase === "online" ? campaign.onlineClosesAt : null} />
          ) : (
            coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- served by /media, already sized
              <img src={coverUrl} alt="" className="aspect-[3/2] w-full rounded-xl bg-surface object-cover" />
            )
          )}
        </div>
      </Container>
    </section>
  )
}

/**
 * Three board cells under the name: the time that matters now (when online
 * ordering opens, or the last order) big with its date, how orders arrive,
 * and the fee or the place.
 */
function Facts({ campaign, phase }: { campaign: Campaign; phase: ReturnType<typeof campaignPhase> }) {
  const { delivery, pickup, booth } = campaign.offers
  const [timeLabel, at, instead] =
    phase === "upcoming"
      ? ["Opens", campaign.onlineOpensAt, "Soon"]
      : phase === "online"
        ? ["Last order", campaign.onlineClosesAt, "Any time"]
        : phase === "booth"
          ? ["At the booth", null, "Now"]
          : ["Online ordering", null, "Closed"]
  const facts = [
    {
      label: "How you get it",
      value: [delivery && "Delivery", pickup && "Pickup", booth && "Booth"].filter(Boolean).join(" · "),
    },
    delivery
      ? { label: "Delivery fee", value: campaign.deliveryFeeFen === 0 ? "Free" : formatYuan(campaign.deliveryFeeFen) }
      : { label: "Where", value: campaign.pickupInfo },
  ]

  return (
    <dl className="grid max-w-2xl grid-cols-1 gap-4 border-t pt-6 @xl:grid-cols-3 @xl:gap-0 @xl:divide-x">
      <div className="flex flex-col gap-1 @xl:pe-6">
        <dt className="type-kicker text-muted">{timeLabel}</dt>
        <dd className="flex flex-col">
          {at ? (
            <>
              <time dateTime={toShenzhenIso(at)} className="type-heading-lg text-text tabular-nums">
                {formatTime(at)}
              </time>
              <span className="type-caption text-muted">{formatDate(at)}</span>
            </>
          ) : (
            <span className="type-heading-lg text-text">{instead}</span>
          )}
        </dd>
      </div>
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1 @xl:px-6 @xl:last:pe-0">
          <dt className="type-kicker text-muted">{fact.label}</dt>
          <dd className="type-heading-sm text-text">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function FeaturedCard({ featured, closesAt }: { featured: Featured; closesAt: Date | null }) {
  const { item, inBundles } = featured
  return (
    <article aria-labelledby="featured" className="flex flex-col gap-4 rounded-xl bg-surface p-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-bg">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- served by /media, already sized
          <img src={item.imageUrl} alt="" className="size-full object-cover" />
        )}
        <span className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant="highlight">Featured</Badge>
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-bg">
              {tag}
            </Badge>
          ))}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="featured" className="type-heading-md text-text">
            {item.name}
          </h2>
          <span className="shrink-0 type-heading-md text-text">
            {item.priceFrom && <span className="type-caption text-muted">from </span>}
            {formatYuan(item.priceFen)}
          </span>
        </div>
        {item.detail && <p className="line-clamp-2 type-body-sm text-muted">{item.detail}</p>}
      </div>
      <div className="flex flex-col gap-2 px-1">
        {item.startsAt ? (
          <span className="type-caption text-text">On sale from {formatDate(new Date(item.startsAt))}</span>
        ) : (
          item.stock && <StockBar left={item.stock.left} total={item.stock.total} />
        )}
        {closesAt && <span className="type-caption text-muted">Online ordering closes {formatDate(closesAt)}</span>}
        <Allergens allergens={item.allergens} />
      </div>
      <NextLink href={item.href} className={buttonVariants({ className: "w-full" })}>
        See {item.name}
      </NextLink>
      {inBundles.length > 0 && (
        <p className="border-t px-1 pt-3 type-caption text-muted">
          Also in{" "}
          {inBundles.map((b, i) => (
            <span key={b.href}>
              {i > 0 && ", "}
              <NextLink href={b.href} className="text-text underline underline-offset-4">
                {b.name}
              </NextLink>
            </span>
          ))}
        </p>
      )}
    </article>
  )
}
