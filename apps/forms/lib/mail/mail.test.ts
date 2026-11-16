import { createHmac } from "node:crypto"
import { describe, expect, test } from "bun:test"

import { calendarFile } from "./ics"
import { shouldReplace, verifyWebhook } from "./webhook"

describe("webhook signature", () => {
  const secret = "whsec_" + Buffer.from("test-secret").toString("base64")
  const body = '{"type":"email.delivered"}'
  const now = 1_800_000_000_000
  const timestamp = String(now / 1000)
  const sign = (b: string) =>
    "v1," + createHmac("sha256", Buffer.from("test-secret")).update(`msg_1.${timestamp}.${b}`).digest("base64")

  test("accepts Resend's signature and refuses a changed body or an old one", () => {
    const headers = { id: "msg_1", timestamp, signature: `v1,bogus ${sign(body)}` }
    expect(verifyWebhook(body, headers, secret, now)).toBe(true)
    expect(verifyWebhook(body + " ", headers, secret, now)).toBe(false)
    expect(verifyWebhook(body, headers, secret, now + 10 * 60_000)).toBe(false)
    expect(verifyWebhook(body, { ...headers, signature: null }, secret, now)).toBe(false)
  })

  test("a bounce is never overwritten by a late 'sent'", () => {
    expect(shouldReplace("bounced", "sent")).toBe(false)
    expect(shouldReplace("sent", "delivered")).toBe(true)
  })
})

test("calendar file has one event per day, timed in UTC or all-day", () => {
  const ics = calendarFile({
    uid: "r1",
    title: "Gala Night, 2027",
    venue: "Aula SZU",
    url: "https://forms.ppitshenzhen.org/tickets/x",
    days: [
      { id: "d1", date: "2027-03-17", starts: "18:00", ends: "21:00" },
      { id: "d2", date: "2027-03-18", starts: "", ends: "" },
    ],
    now: new Date("2027-03-01T00:00:00Z"),
  })
  expect(ics).toContain("DTSTART:20270317T100000Z")
  expect(ics).toContain("DTEND:20270317T130000Z")
  expect(ics).toContain("DTSTART;VALUE=DATE:20270318")
  expect(ics).toContain("DTEND;VALUE=DATE:20270319")
  expect(ics).toContain("SUMMARY:Gala Night\\, 2027")
  expect(ics.split("BEGIN:VEVENT")).toHaveLength(3)
})
