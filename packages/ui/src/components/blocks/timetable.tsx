import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"
import {
  formatDate,
  formatTime,
  toShenzhenIso,
  WIB_TZ,
} from "@ppitsz/ui/lib/format"

/*
 * Timetable: the "First train / Last train" sign at a station entrance, for
 * the times that bound something: a campaign's first and last online order
 * and its booth hours, a form's opening and closing. Each row is a label
 * and a time, big and tabular, with its date below. A row without a time
 * says so in words ("Any time"). Times are Shenzhen time; `wib` adds the
 * WIB time for family-facing pages.
 */

export interface TimetableRow {
  /** "First order", "Last order", "At the booth". */
  label: string
  /** Null: no limit on this side. */
  at: Date | null
  /** A range: 09:00–17:00 on the same day. */
  until?: Date
  /** Said instead of a time when `at` is null. */
  none?: string
}

function TimeValue({ date }: { date: Date }) {
  return <time dateTime={toShenzhenIso(date)}>{formatTime(date)}</time>
}

function Timetable({
  title,
  rows,
  line,
  wib = false,
  footnote = "Shenzhen time",
  headingLevel = "h2",
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  rows: readonly TimetableRow[]
  line?: LineCode
  /** Add the WIB time under each time. */
  wib?: boolean
  footnote?: React.ReactNode
  headingLevel?: "h2" | "h3" | "h4"
}) {
  const Heading = headingLevel
  return (
    <section
      data-slot="timetable"
      data-line={line}
      className={cn("@container flex w-full flex-col gap-4 rounded-xl bg-surface p-5 @md:p-6", className)}
      {...props}
    >
      <span aria-hidden className="route" />
      <Heading className="type-kicker text-muted">{title}</Heading>
      <dl className="flex flex-col">
        {rows.map((row, i) => (
          <div
            key={i}
            data-slot="timetable-row"
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
          >
            <dt className="type-sign text-text">{row.label}</dt>
            <dd className="flex flex-col items-end text-right">
              {row.at ? (
                <>
                  <span className="type-heading-lg text-text tabular-nums">
                    <TimeValue date={row.at} />
                    {row.until && (
                      <>
                        –<TimeValue date={row.until} />
                      </>
                    )}
                  </span>
                  <span className="type-caption text-muted">
                    {formatDate(row.at)}
                    {wib && (
                      <>
                        {" · "}
                        {formatTime(row.at, "en", WIB_TZ)}
                        {row.until && `–${formatTime(row.until, "en", WIB_TZ)}`} WIB
                      </>
                    )}
                  </span>
                </>
              ) : (
                <span className="type-heading-sm text-muted">{row.none ?? "Any time"}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="type-caption text-muted">{footnote}</p>}
    </section>
  )
}

export { Timetable }
