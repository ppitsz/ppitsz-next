import * as React from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { LineBadges } from "@ppitsz/ui/components/network/line-badge"

/*
 * Station nameplate: a page's title as the name sign on a platform wall. An
 * ink band with the line on top, the lines that stop here, the name, and
 * along the bottom the stations either side, as platform signs show them:
 * "← Catalog · Pay →". For the pages of a flow (a campaign, its checkout,
 * an order), so the buyer always sees where they are and what comes next.
 * The previous station is usually a link back; the next is usually words,
 * since the page's own button goes there.
 */

export interface NameplateStation {
  label: React.ReactNode
  href?: string
}

function Neighbour({
  station,
  side,
  label,
  linkAs,
}: {
  station: NameplateStation
  side: "previous" | "next"
  label: string
  linkAs?: React.ElementType
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const Arrow = side === "previous" ? ArrowLeftIcon : ArrowRightIcon
  const content = (
    <>
      {side === "previous" && <Arrow aria-hidden weight="bold" className="size-5 shrink-0" />}
      <span className={cn("flex min-w-0 flex-col gap-0.5", side === "next" && "items-end text-end")}>
        <span className="type-kicker text-muted">{label}</span>
        <span className="type-sign text-text">{station.label}</span>
      </span>
      {side === "next" && <Arrow aria-hidden weight="bold" className="size-5 shrink-0" />}
    </>
  )
  const layout = cn(
    "flex min-h-14 items-center gap-3 px-5 py-3 text-text @md:px-6",
    side === "next" && "justify-end"
  )
  return station.href ? (
    <Link
      href={station.href}
      className={cn(
        layout,
        "underline-offset-4 transition-colors duration-(--duration-fast) ease-out hover:bg-surface [&:hover_.type-sign]:underline focus-visible:-outline-offset-2"
      )}
    >
      {content}
    </Link>
  ) : (
    <span className={layout}>{content}</span>
  )
}

function StationNameplate({
  name,
  zh,
  kicker,
  line,
  lines,
  previous,
  next,
  linkAs,
  headingLevel = "h1",
  labels,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"header">, "children"> & {
  /** The station: the page's title. */
  name: React.ReactNode
  /** Chinese name, under it. Only for places. */
  zh?: React.ReactNode
  /** One line above the name: the campaign, the organization. */
  kicker?: React.ReactNode
  /** The line along the top. Brand red by default. */
  line?: LineCode
  /** The divisions that stop here, as line badges. */
  lines?: readonly LineCode[]
  previous?: NameplateStation
  next?: NameplateStation
  linkAs?: React.ElementType
  headingLevel?: "h1" | "h2"
  labels?: { previous?: string; next?: string; nav?: string }
  /** Under the name, inside the band: a status badge, a short note. */
  children?: React.ReactNode
}) {
  const Heading = headingLevel
  return (
    <header
      data-slot="station-nameplate"
      className={cn("tone-ink @container flex flex-col overflow-hidden rounded-xl", className)}
      {...props}
    >
      <div data-line={line} className="flex flex-col gap-4 px-5 pt-5 pb-6 @md:px-6 @md:pb-8">
        <span aria-hidden className="route" />
        {(lines?.length || kicker) && (
          <div className="flex flex-wrap items-center gap-3">
            {lines && lines.length > 0 && <LineBadges codes={lines} />}
            {kicker && <span className="type-kicker text-muted">{kicker}</span>}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Heading className="type-display-xl text-text">{name}</Heading>
          {zh && (
            <span lang="zh-Hans" className="type-heading-md text-muted">
              {zh}
            </span>
          )}
        </div>
        {children}
      </div>
      {(previous || next) && (
        <nav aria-label={labels?.nav ?? "Stations either side"} className="grid grid-cols-2 border-t">
          <div className="min-w-0">
            {previous && (
              <Neighbour station={previous} side="previous" label={labels?.previous ?? "Previous"} linkAs={linkAs} />
            )}
          </div>
          <div className="min-w-0 border-s">
            {next && <Neighbour station={next} side="next" label={labels?.next ?? "Next"} linkAs={linkAs} />}
          </div>
        </nav>
      )}
    </header>
  )
}

export { StationNameplate }
