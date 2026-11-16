import { formatDate, formatTime } from "@ppitsz/ui/lib/format"

import { dayStart, daysOf, typeAvailability } from "./domain/tickets"
import type { EventDay, Form } from "./domain/types"

/*
 * The sentences about a form and its event, shared by pages and emails, so
 * a date reads the same on the ticket and in the inbox. Shenzhen time.
 */

/** "Wed, Mar 17 · 18:00–21:00" */
export function dayLabel(day: EventDay) {
  const date = formatDate(dayStart(day))
  if (!day.starts) return date
  return `${date} · ${day.starts}${day.ends ? `–${day.ends}` : ""}`
}

export function sortedDays(days: EventDay[]) {
  return [...days].sort((a, b) => a.date.localeCompare(b.date) || a.starts.localeCompare(b.starts))
}

/** "Wed, Mar 17, 23:59": a deadline or a sale date. */
export function when(date: Date) {
  return `${formatDate(date)}, ${formatTime(date)}`
}

/** The ticket types as the form page offers them, with why one can't be picked. */
export function ticketChoices(form: Form, now: Date) {
  if (!form.tickets.enabled) return null
  const allDays = form.tickets.days.length
  return form.tickets.types.map((type) => {
    const { state, left } = typeAvailability(form, type, now)
    const days = sortedDays(daysOf(form, type.id))
    return {
      id: type.id,
      name: type.name,
      description: type.description,
      days: allDays > 1 ? (days.length === allDays ? "Every day" : days.map((d) => formatDate(dayStart(d))).join(", ")) : "",
      unavailable:
        state === "not_yet" && type.salesStart
          ? `From ${when(type.salesStart)}`
          : state === "ended"
            ? "Sales have ended"
            : state === "sold_out"
              ? "Sold out"
              : null,
      note: left !== null && left <= 20 ? `${left} left` : type.salesEnd ? `Until ${when(type.salesEnd)}` : "",
    }
  })
}

/** Paths and full links, from one place. */
export const paths = {
  form: (form: Pick<Form, "slug">) => `/${form.slug}`,
  back: (form: Pick<Form, "slug">) => `/${form.slug}/find`,
  response: (token: string, tickets: boolean) => (tickets ? `/tickets/${token}` : `/responses/${token}`),
  edit: (token: string) => `/responses/${token}/edit`,
  calendar: (token: string) => `/tickets/${token}/calendar`,
  media: (path: string) => `/media/${path.split("/").map(encodeURIComponent).join("/")}`,
  upload: (path: string) => `/staff/files/${path.split("/").map(encodeURIComponent).join("/")}`,
}
