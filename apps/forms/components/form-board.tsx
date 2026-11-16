import NextLink from "next/link"

import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatTime, toShenzhenIso } from "@ppitsz/ui/lib/format"
import { formPhase, type FormPhase } from "@/lib/domain/form"
import { dayStart } from "@/lib/domain/tickets"
import type { Form } from "@/lib/domain/types"
import { paths, sortedDays } from "@/lib/form-copy"
import { PHASE_BADGE } from "@/lib/labels"

/*
 * The open forms as a departure board, like the shop's campaign board: one
 * row each, soonest to close first. The time column is the moment that
 * matters now: when sign-ups open, or the last moment to answer. Under a
 * day before the close, the row says "Final call". The platform is where
 * the event happens, or "Online" for a form without one. The status badge
 * always says the real status in words; the board only adds the urgency.
 */

const FINAL_CALL_MS = 24 * 60 * 60 * 1000

/** Open by close, then fully booked, then opening soon by opening. */
function departureOrder(form: Form, phase: FormPhase) {
  const far = Number.MAX_SAFE_INTEGER
  if (phase === "open") return [0, form.closesAt?.getTime() ?? far]
  if (phase === "full") return [1, form.closesAt?.getTime() ?? far]
  if (phase === "upcoming") return [2, form.opensAt?.getTime() ?? far]
  return [3, 0]
}

export function FormBoard({ forms, now }: { forms: Form[]; now: Date }) {
  const rows = forms
    .map((form) => ({ form, phase: formPhase(form, now) }))
    .sort((a, b) => {
      const [ga, ta] = departureOrder(a.form, a.phase)
      const [gb, tb] = departureOrder(b.form, b.phase)
      return ga! - gb! || ta! - tb!
    })

  return (
    <div className="tone-ink @container overflow-hidden rounded-xl">
      <div
        aria-hidden
        className="hidden border-b px-5 py-3 type-kicker text-muted @3xl:grid @3xl:grid-cols-[9rem_minmax(0,1fr)_14rem_10rem] @3xl:gap-6"
      >
        <span>Time</span>
        <span>Form</span>
        <span>Platform</span>
        <span>Status</span>
      </div>
      <ul className="flex flex-col">
        {rows.map(({ form, phase }) => (
          <li key={form.id} className="border-b last:border-b-0">
            <BoardRow form={form} phase={phase} now={now} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BoardRow({ form, phase, now }: { form: Form; phase: FormPhase; now: Date }) {
  const finalCall = phase === "open" && !!form.closesAt && form.closesAt.getTime() - now.getTime() < FINAL_CALL_MS
  const [first] = sortedDays(form.tickets.enabled ? form.tickets.days : [])

  return (
    <div className="group/row relative grid gap-x-6 gap-y-3 px-5 py-5 transition-colors duration-(--duration-fast) ease-out hover:bg-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus @3xl:grid-cols-[9rem_minmax(0,1fr)_14rem_10rem] @3xl:items-center">
      <TimeCell form={form} phase={phase} />
      <div className="flex min-w-0 flex-col items-start gap-2">
        <LineBadge code={form.line} />
        <h3 className="type-heading-md text-text">
          <NextLink
            href={paths.form(form)}
            className="outline-none after:absolute after:inset-0 underline-offset-4 group-hover/row:underline"
          >
            {form.title}
          </NextLink>
        </h3>
        {form.description && <p className="line-clamp-2 type-body-sm text-muted">{form.description}</p>}
      </div>
      <p className="flex flex-col gap-0.5">
        <span className="type-kicker text-muted @3xl:hidden">Platform</span>
        <span className="type-sign text-text">{form.tickets.enabled && form.tickets.venue ? form.tickets.venue : "Online"}</span>
        {first && <span className="type-caption text-muted">Event {formatDate(dayStart(first))}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:flex-col @3xl:items-start">
        {finalCall && <span className="type-kicker text-accent-text">Final call</span>}
        <StatusBadge domain="form" value={PHASE_BADGE[phase]} />
      </div>
    </div>
  )
}

function TimeCell({ form, phase }: { form: Form; phase: FormPhase }) {
  const [label, date] =
    phase === "upcoming" ? ["Opens", form.opensAt] : phase === "open" || phase === "full" ? ["Closes", form.closesAt] : ["Closed", null]
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
        <span className="type-heading-lg text-text">{phase === "open" || phase === "full" ? "Any time" : "–"}</span>
      )}
    </p>
  )
}
