import * as React from "react"
import { ClockIcon, InfoIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { formatDate, formatTime, toShenzhenIso } from "@ppitsz/ui/lib/format"
import { LineBadges } from "@ppitsz/ui/components/network/line-badge"

/*
 * Service notice: a station's posted announcement, for a change to something
 * people planned around: pickup moved, a campaign or form closed early, an
 * event canceled. An ink header names the kind and the lines affected; the
 * body says what happened in a title and what to do in the text, with one
 * action at most. Use Alert for feedback on the screen's own task; use a
 * service notice when the service itself changed.
 */

export type ServiceNoticeKind = "notice" | "change" | "suspended" | "ended"

const KINDS = {
  notice: { label: "Service notice", Icon: InfoIcon, icon: "text-text" },
  change: { label: "Service change", Icon: WarningIcon, icon: "text-warning" },
  suspended: { label: "Service canceled", Icon: WarningCircleIcon, icon: "text-danger" },
  ended: { label: "Service has ended", Icon: ClockIcon, icon: "text-muted" },
} as const

function ServiceNotice({
  kind = "notice",
  title,
  lines,
  updatedAt,
  label,
  action,
  headingLevel = "h2",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  kind?: ServiceNoticeKind
  /** What happened, in one line: "Pickup moves to the north gate". */
  title: React.ReactNode
  /** The divisions whose service it is. */
  lines?: readonly LineCode[]
  /** When it was posted or last changed. */
  updatedAt?: Date
  /** Replaces the kind's header words. */
  label?: React.ReactNode
  /** One button or link: what to do now. */
  action?: React.ReactNode
  /** h1 when the notice is the whole page, as on an error page. */
  headingLevel?: "h1" | "h2" | "h3"
}) {
  const id = React.useId()
  const { label: kindLabel, Icon, icon } = KINDS[kind]
  const Heading = headingLevel
  return (
    <section
      data-slot="service-notice"
      data-kind={kind}
      aria-labelledby={id}
      className={cn("@container flex w-full flex-col overflow-hidden rounded-xl", className)}
      {...props}
    >
      <header className="tone-ink flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 @md:px-5">
        <Icon aria-hidden weight="regular" className={cn("size-5 shrink-0", icon)} />
        <span className="type-kicker text-text">{label ?? kindLabel}</span>
        {lines && lines.length > 0 && <LineBadges codes={lines} />}
        {updatedAt && (
          <span className="ms-auto type-caption text-muted">
            Updated{" "}
            <time dateTime={toShenzhenIso(updatedAt)}>
              {formatDate(updatedAt)} · {formatTime(updatedAt)}
            </time>
          </span>
        )}
      </header>
      <div className="flex flex-col items-start gap-3 bg-surface px-4 py-5 @md:px-5">
        <Heading id={id} className="type-heading-md text-text">
          {title}
        </Heading>
        {children && (
          <div className="flex max-w-[66ch] flex-col gap-3 type-body text-text [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:decoration-2">
            {children}
          </div>
        )}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </section>
  )
}

export { ServiceNotice }
