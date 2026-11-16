import { FormError } from "./errors"
import type { CheckIn, EventDay, Form, FormResponse, TicketType } from "./types"

/*
 * Ticket rules: which ticket types are on sale, how many places are left,
 * who may cancel, and what a scan at the door does. A sale needs room in
 * both its type's quota and the event's capacity.
 */

export type TypeState = "on_sale" | "not_yet" | "ended" | "sold_out"

export interface TypeAvailability {
  state: TypeState
  /** Places left for this type, counting the event's capacity; null when unlimited. */
  left: number | null
}

function minLeft(...values: (number | null)[]) {
  const finite = values.filter((v): v is number => v !== null)
  return finite.length ? Math.max(0, Math.min(...finite)) : null
}

/** Places left on the whole form (its response cap and ticket capacity). */
export function placesLeft(form: Form) {
  const { live } = form.counts
  return minLeft(
    form.settings.maxResponses === null ? null : form.settings.maxResponses - live,
    form.tickets.enabled && form.tickets.capacity !== null ? form.tickets.capacity - live : null
  )
}

export function typeAvailability(form: Form, type: TicketType, now: Date): TypeAvailability {
  const taken = form.counts.byType[type.id] ?? 0
  const left = minLeft(type.quota === null ? null : type.quota - taken, placesLeft(form))
  if (type.salesStart && now < type.salesStart) return { state: "not_yet", left }
  if (type.salesEnd && now >= type.salesEnd) return { state: "ended", left }
  if (left === 0) return { state: "sold_out", left }
  return { state: "on_sale", left }
}

/**
 * The ticket type a new response takes, or why it can't. Online responses
 * need the type on sale; a door sale ignores sale dates but not quotas.
 */
export function assertTypeAvailable(form: Form, typeId: string | null, now: Date, { door = false } = {}) {
  if (!form.tickets.enabled) return null
  const type = form.tickets.types.find((t) => t.id === typeId)
  if (!type) throw new FormError("TYPE_UNAVAILABLE")
  const { state, left } = typeAvailability(form, type, now)
  if (left === 0) throw new FormError("FULL")
  if (!door && state !== "on_sale") throw new FormError("TYPE_UNAVAILABLE")
  return type
}

/** The counters after one response of `typeId` is added (+1) or canceled (-1). */
export function countsAfter(form: Form, typeId: string | null, delta: 1 | -1) {
  const byType = { ...form.counts.byType }
  if (typeId) byType[typeId] = Math.max(0, (byType[typeId] ?? 0) + delta)
  return {
    total: form.counts.total + (delta === 1 ? 1 : 0),
    live: Math.max(0, form.counts.live + delta),
    byType,
  }
}

/* -------------------------------------------------------------------------
   Days
   ------------------------------------------------------------------------- */

/** The days a ticket type gets in on. */
export function daysOf(form: Form, typeId: string | null): EventDay[] {
  const type = form.tickets.types.find((t) => t.id === typeId)
  if (!type || type.dayIds.length === 0) return form.tickets.days
  return form.tickets.days.filter((d) => type.dayIds.includes(d.id))
}

/** "2027-03-17" for `now` in Shenzhen. */
export function shenzhenDate(now: Date) {
  return new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10)
}

/** The event day the scanner starts on: today's, else the next one, else the last. */
export function defaultDay(form: Form, now: Date): EventDay | null {
  const days = [...form.tickets.days].sort((a, b) => a.date.localeCompare(b.date))
  const today = shenzhenDate(now)
  return days.find((d) => d.date === today) ?? days.find((d) => d.date > today) ?? days.at(-1) ?? null
}

/** The day's start as a Date in Shenzhen time (midnight without a start time). */
export function dayStart(day: EventDay) {
  return new Date(`${day.date}T${day.starts || "00:00"}:00+08:00`)
}

/** The day's end (the end time, or the start plus two hours, or the end of the day). */
export function dayEnd(day: EventDay) {
  if (day.ends) return new Date(`${day.date}T${day.ends}:00+08:00`)
  if (day.starts) return new Date(dayStart(day).getTime() + 2 * 60 * 60_000)
  return new Date(`${day.date}T23:59:00+08:00`)
}

/** After the event's last day: tickets are kept but no longer canceled by their holder. */
export function eventOver(form: Form, now: Date) {
  const days = form.tickets.days
  if (!form.tickets.enabled || days.length === 0) return false
  return days.every((d) => dayEnd(d) < now)
}

/* -------------------------------------------------------------------------
   Cancelling
   ------------------------------------------------------------------------- */

/**
 * Responders cancel their own free ticket until the event is over, unless
 * they were already checked in. Their place goes back to the quota.
 */
export function canSelfCancel(form: Form, response: FormResponse, now: Date) {
  if (response.status !== "live" || form.cancelledAt) return false
  if (form.status === "done" || form.status === "draft") return false
  if (Object.keys(response.checkIns).length > 0) return false
  if (form.tickets.enabled) return !eventOver(form, now)
  // A plain form's response: withdrawable while the form takes responses.
  return form.status === "open" && !(form.closesAt && now >= form.closesAt)
}

/* -------------------------------------------------------------------------
   The door
   ------------------------------------------------------------------------- */

export type ScanResult =
  | { kind: "checked_in" }
  | { kind: "again"; checkIn: CheckIn }
  | { kind: "refused"; reason: "cancelled" | "wrong_day" | "event_cancelled" }

/**
 * What scanning `response` for `dayId` does. A second scan on the same day
 * is not refused: it shows who checked the ticket in and when, so organizers
 * can tell a mix-up from a shared screenshot.
 */
export function scanDecision(form: Form, response: FormResponse, dayId: string): ScanResult {
  if (form.cancelledAt) return { kind: "refused", reason: "event_cancelled" }
  if (response.status !== "live") return { kind: "refused", reason: "cancelled" }
  if (!daysOf(form, response.ticketTypeId).some((d) => d.id === dayId)) {
    return { kind: "refused", reason: "wrong_day" }
  }
  const previous = response.checkIns[dayId]
  return previous ? { kind: "again", checkIn: previous } : { kind: "checked_in" }
}

export const SCAN_REFUSALS: Record<Extract<ScanResult, { kind: "refused" }>["reason"], string> = {
  cancelled: "This ticket has been canceled.",
  wrong_day: "This ticket type isn't valid today.",
  event_cancelled: "This event has been canceled.",
}
