import * as React from "react"
import { ImagesIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import {
  dateParts,
  formatRelativeDays,
  formatTime,
  toShenzhenIso,
} from "@ppitsz/ui/lib/format"
import type { CampusId, EventStatus, LineCode } from "@ppitsz/ui/lib/network"
import { Button } from "@ppitsz/ui/components/button"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { LineBadges } from "@ppitsz/ui/components/network/line-badge"
import { CampusLabel } from "@ppitsz/ui/components/network/station-label"
import { Station } from "@ppitsz/ui/components/network/route"

/*
 * Departure board (layout L3). Events are departures: rows on a board, not
 * boxed cards. Columns: time, event (title + line badges), station, status.
 * Each row's title link is stretched over the row; the register button sits
 * above it.
 */

export interface DepartureEvent {
  slug: string
  title: string
  /** Shenzhen time. */
  startsAt: Date
  campus: CampusId
  venue?: string
  divisions: LineCode[]
  status: EventStatus
  summary?: string
  href: string
  registrationUrl?: string
  galleryUrl?: string
}

const COPY = {
  register: "Register",
  gallery: "View gallery",
  here: "You are here",
  newTab: "(opens in a new tab)",
}

interface RowProps {
  event: DepartureEvent
  variant?: "next" | "row" | "compact" | "past"
  /** A 3:2 image (e.g. next/image with alt=""). Shown from md up. */
  media?: React.ReactNode
  linkAs?: React.ElementType
  /** Reference time for "In 12 days" on the next departure. */
  now?: Date
  /** Draw the timeline station in the leading column. */
  timeline?: boolean
  headingLevel?: "h2" | "h3"
}

function TimeCell({
  event,
  muted,
}: {
  event: DepartureEvent
  muted?: boolean
}) {
  const { day, month, weekday } = dateParts(event.startsAt)
  return (
    <time
      dateTime={toShenzhenIso(event.startsAt)}
      className={cn("flex flex-col gap-1", muted ? "text-muted" : "text-text")}
    >
      <span className="flex items-baseline gap-2">
        <span className="type-numeral">{day}</span>
        <span className="flex flex-col type-sign">
          <span>{month}</span>
          <span className="text-muted">{weekday}</span>
        </span>
      </span>
      <span className="type-sign text-muted">{formatTime(event.startsAt)}</span>
    </time>
  )
}

function DepartureRow({
  event,
  variant = "row",
  media,
  linkAs,
  now,
  timeline = false,
  headingLevel = "h3",
}: RowProps) {
  const Link: React.ElementType = linkAs ?? "a"
  const Heading = headingLevel
  const copy = COPY
  const past = variant === "past"
  const next = variant === "next"

  const titleLink = (
    <Link
      href={event.href}
      data-slot="row-link"
      className="outline-none after:absolute after:inset-0 group-hover/row:underline underline-offset-4"
    >
      {event.title}
    </Link>
  )

  if (variant === "compact") {
    const { day, month } = dateParts(event.startsAt)
    return (
      <li
        data-slot="departure-row"
        data-variant="compact"
        className="group/row relative flex items-start gap-4 border-b py-3 hover:bg-surface-strong has-[[data-slot=row-link]:focus-visible]:outline-2 has-[[data-slot=row-link]:focus-visible]:outline-focus"
      >
        <time dateTime={toShenzhenIso(event.startsAt)} className="w-14 shrink-0 type-sign text-muted">
          {month} {day}
        </time>
        <span className="flex min-w-0 flex-col gap-1.5">
          <Heading className="type-ui text-text">{titleLink}</Heading>
          <LineBadges codes={event.divisions} />
        </span>
      </li>
    )
  }

  return (
    <li
      data-slot="departure-row"
      data-variant={variant}
      className={cn(
        "group/row relative grid gap-x-6 gap-y-3 border-b px-3 py-5 @md:px-4",
        "transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong",
        "has-[[data-slot=row-link]:focus-visible]:outline-2 has-[[data-slot=row-link]:focus-visible]:-outline-offset-2 has-[[data-slot=row-link]:focus-visible]:outline-focus",
        timeline ? "grid-cols-[18px_1fr]" : "grid-cols-1",
        next ? "@2xl:py-8" : ""
      )}
    >
      {timeline && (
        <span aria-hidden className="relative row-span-full flex justify-center pt-2">
          <span className="route-v absolute top-0 -bottom-px" />
          <Station state={past ? "passed" : "upcoming"} />
        </span>
      )}
      <div
        className={cn(
          "grid min-w-0 gap-x-6 gap-y-3",
          next
            ? "@2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            : media
              ? "@2xl:grid-cols-[7.5rem_minmax(0,1fr)_12rem] @4xl:grid-cols-[7.5rem_minmax(0,1fr)_13rem_11rem] @5xl:grid-cols-[7.5rem_minmax(0,1fr)_13rem_11rem_9rem]"
              : "@2xl:grid-cols-[7.5rem_minmax(0,1fr)_12rem] @4xl:grid-cols-[7.5rem_minmax(0,1fr)_13rem_11rem]"
        )}
      >
        {next ? (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <TimeCell event={event} />
                <span className="type-kicker text-accent-text">
                  {formatRelativeDays(event.startsAt, "en", now)}
                </span>
              </div>
              <Heading className="type-heading-lg text-text">{titleLink}</Heading>
              <LineBadges codes={event.divisions} />
              {event.summary && (
                <p className="max-w-[66ch] type-body-sm text-muted">{event.summary}</p>
              )}
              <CampusLabel campus={event.campus} />
              {event.venue && <span className="-mt-3 type-caption text-muted">{event.venue}</span>}
              <div className="relative z-10 flex flex-wrap items-center gap-3">
                <StatusBadge domain="event" value={event.status} />
                {event.status === "registration_open" && event.registrationUrl && (
                  <Button variant="primary" nativeButton={false} render={<Link href={event.registrationUrl} />}>
                    {copy.register}
                  </Button>
                )}
              </div>
            </div>
            {media && (
              <div className="aspect-[3/2] overflow-hidden rounded-xl bg-surface [&_img]:size-full [&_img]:object-cover">
                {media}
              </div>
            )}
          </>
        ) : (
          <>
            <TimeCell event={event} muted={past} />
            <div className="flex min-w-0 flex-col gap-2.5">
              <Heading className={cn("type-heading-lg", past ? "text-muted" : "text-text")}>
                {titleLink}
              </Heading>
              <LineBadges codes={event.divisions} />
            </div>
            <div className="flex flex-col gap-1">
              <CampusLabel campus={event.campus} />
              {event.venue && <span className="type-caption text-muted">{event.venue}</span>}
            </div>
            <div className="relative z-10 flex flex-wrap items-start gap-3 @2xl:col-start-3 @4xl:col-start-auto @4xl:flex-col">
              <StatusBadge domain="event" value={event.status} />
              {!past && event.status === "registration_open" && event.registrationUrl && (
                <Button size="sm" nativeButton={false} render={<Link href={event.registrationUrl} />}>
                  {copy.register}
                </Button>
              )}
              {past && event.galleryUrl && (
                <Button
                  size="sm"
                  variant="quiet"
                  nativeButton={false}
                  render={<a href={event.galleryUrl} target="_blank" rel="noreferrer" />}
                >
                  <ImagesIcon aria-hidden />
                  {copy.gallery}
                  <span className="sr-only"> {copy.newTab}</span>
                </Button>
              )}
            </div>
            {media && (
              <div className="hidden aspect-[3/2] overflow-hidden rounded-xl bg-surface @5xl:block [&_img]:size-full [&_img]:object-cover">
                {media}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}

/** The "You are here" marker between the last past and the next upcoming row. */
function DepartureNow() {
  return (
    <li
      aria-current="time"
      data-slot="departure-now"
      className="grid grid-cols-[18px_1fr] items-center gap-x-6 px-3 py-4 @md:px-4"
    >
      <span aria-hidden className="relative flex justify-center">
        <span className="route-v absolute -top-4 -bottom-4" />
        <Station state="here" />
      </span>
      <span className="type-kicker text-accent-text">{COPY.here}</span>
    </li>
  )
}

function DepartureBoard({
  className,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="departure-board"
      className={cn("@container flex flex-col border-t", className)}
      {...props}
    />
  )
}

export { DepartureBoard, DepartureRow, DepartureNow }
