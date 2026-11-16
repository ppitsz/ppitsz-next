import { dayEnd, dayStart } from "../domain/tickets"
import type { EventDay } from "../domain/types"

/*
 * "Add to calendar": an iCalendar file with one event per day, attached to
 * the ticket email and offered on the ticket page. Times are written in UTC,
 * so every calendar app shows them in the reader's own zone correctly.
 */

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const compactDate = (date: string) => date.replace(/-/g, "")

function nextDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Escapes text values (RFC 5545 §3.3.11). */
function escape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1")
}

/** Folds lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string) {
  const parts: string[] = []
  let rest = line
  while (Buffer.byteLength(rest) > 75) {
    let cut = 74
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--
    parts.push(rest.slice(0, cut))
    rest = " " + rest.slice(cut)
  }
  parts.push(rest)
  return parts.join("\r\n")
}

export function calendarFile({
  uid,
  title,
  venue,
  url,
  days,
  now,
}: {
  uid: string
  title: string
  venue: string
  url: string
  days: EventDay[]
  now: Date
}) {
  const events = days.flatMap((day) => [
    "BEGIN:VEVENT",
    `UID:${uid}-${day.id}@forms.ppitshenzhen.org`,
    `DTSTAMP:${utc(now)}`,
    ...(day.starts
      ? [`DTSTART:${utc(dayStart(day))}`, `DTEND:${utc(dayEnd(day))}`]
      : [`DTSTART;VALUE=DATE:${compactDate(day.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDate(day.date))}`]),
    `SUMMARY:${escape(title)}`,
    ...(venue ? [`LOCATION:${escape(venue)}`] : []),
    `DESCRIPTION:${escape(`Your ticket: ${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
  ])
  return (
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PPIT Shenzhen//Forms//ID", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"]
      .map(fold)
      .join("\r\n") + "\r\n"
  )
}
