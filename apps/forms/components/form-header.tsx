import { CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react/ssr"

import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import type { Form } from "@/lib/domain/types"
import { dayLabel, paths, sortedDays } from "@/lib/form-copy"

/**
 * The top of a form's pages: cover photo, organizing division, title, and
 * for an event its days and venue. `children` go after the kicker line
 * (a status badge).
 */
export function FormHeader({
  form,
  kicker,
  description = true,
  children,
}: {
  form: Form
  /** Replaces the title as the heading: "Your ticket", "Edit your answers". */
  kicker?: string
  description?: boolean
  children?: React.ReactNode
}) {
  const days = sortedDays(form.tickets.days)
  return (
    <header className="flex flex-col gap-6">
      {form.coverPath && (
        // eslint-disable-next-line @next/next/no-img-element -- streamed from our own /media, already sized on upload
        <img
          src={paths.media(form.coverPath)}
          alt=""
          className="aspect-[3/2] w-full rounded-xl bg-surface object-cover"
        />
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <LineBadge code={form.line} />
          {children}
        </div>
        {kicker && <p className="type-kicker text-accent-text">{form.title}</p>}
        <h1 className="type-display-xl text-text">{kicker ?? form.title}</h1>
        {description && form.description && (
          <p className="max-w-[66ch] type-lede whitespace-pre-line text-muted">{form.description}</p>
        )}
      </div>
      {form.tickets.enabled && (days.length > 0 || form.tickets.venue) && (
        <dl className="flex flex-col gap-2">
          {days.length > 0 && (
            <div className="flex items-start gap-2">
              <dt>
                <CalendarBlankIcon aria-label="Date" className="mt-0.5 size-5 text-muted" />
              </dt>
              <dd className="type-body text-text">{days.map(dayLabel).join(" · ")} (Shenzhen time)</dd>
            </div>
          )}
          {form.tickets.venue && (
            <div className="flex items-start gap-2">
              <dt>
                <MapPinIcon aria-label="Venue" className="mt-0.5 size-5 text-muted" />
              </dt>
              <dd className="type-body text-text">{form.tickets.venue}</dd>
            </div>
          )}
        </dl>
      )}
    </header>
  )
}
