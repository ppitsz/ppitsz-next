import { connection } from "next/server"

import { dayLabel, sortedDays, when } from "@/lib/form-copy"
import { ogSize, stationSignImage } from "@/lib/og"
import { getFormBySlug } from "@/lib/store"

export const alt = "A PPIT Shenzhen form or event on PPITSZ Forms"
export const size = ogSize
export const contentType = "image/png"

/** A form's share image: its title on its division's line, with the days and venue of an event. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const form = await getFormBySlug((await params).slug)
  // A draft isn't public yet: share nothing about it.
  if (!form || form.status === "draft") {
    return stationSignImage({ title: "PPITSZ Forms", kicker: "PPIT Shenzhen" })
  }
  const days = sortedDays(form.tickets.days)
  const details = form.cancelledAt
    ? "This event was canceled"
    : form.tickets.enabled && days.length > 0
      ? [days.map(dayLabel).join(" · "), form.tickets.venue].filter(Boolean).join(" · ")
      : form.closesAt
        ? `Open until ${when(form.closesAt)}`
        : undefined
  return stationSignImage({
    title: form.title,
    kicker: form.tickets.enabled ? "Event" : "PPIT Shenzhen",
    details,
    line: form.line,
    lines: [form.line],
  })
}
