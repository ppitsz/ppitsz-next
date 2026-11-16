import { describe, expect, test } from "bun:test"

import { parseScan } from "./codes"
import { makeResponse, makeTicketForm, NOW } from "./fixtures"
import { assertTypeAvailable, canSelfCancel, countsAfter, defaultDay, scanDecision, typeAvailability } from "./tickets"

describe("availability", () => {
  test("a type needs room in its quota and the capacity", () => {
    const form = makeTicketForm({ counts: { total: 9, live: 9, byType: { day1: 9 } } })
    const [all, day1] = form.tickets.types
    expect(typeAvailability(form, day1!, NOW)).toEqual({ state: "on_sale", left: 1 })
    expect(typeAvailability(form, all!, NOW)).toEqual({ state: "on_sale", left: 91 })
    const tight = makeTicketForm({ counts: { total: 100, live: 100, byType: { all: 91, day1: 9 } } })
    expect(typeAvailability(tight, tight.tickets.types[1]!, NOW).state).toBe("sold_out")
  })
  test("online sales follow the sale dates; the door ignores them but not the quota", () => {
    const base = makeTicketForm()
    const types = base.tickets.types.map((t) => ({ ...t, salesEnd: NOW }))
    const form = makeTicketForm({ tickets: { ...base.tickets, types } })
    expect(() => assertTypeAvailable(form, "all", NOW)).toThrow()
    expect(assertTypeAvailable(form, "all", NOW, { door: true })?.id).toBe("all")
    const full = makeTicketForm({ counts: { total: 100, live: 100, byType: {} } })
    expect(() => assertTypeAvailable(full, "all", NOW, { door: true })).toThrow()
  })
  test("counters move with the type", () => {
    const form = makeTicketForm({ counts: { total: 1, live: 1, byType: { all: 1 } } })
    expect(countsAfter(form, "all", 1)).toEqual({ total: 2, live: 2, byType: { all: 2 } })
    expect(countsAfter(form, "all", -1)).toEqual({ total: 1, live: 0, byType: { all: 0 } })
  })
})

describe("the door", () => {
  const form = makeTicketForm()
  const checkIn = { at: NOW, byUid: "u", byName: "Rina" }
  test("checks in once per day, then shows the first check-in", () => {
    expect(scanDecision(form, makeResponse(), "d1")).toEqual({ kind: "checked_in" })
    expect(scanDecision(form, makeResponse({ checkIns: { d1: checkIn } }), "d1")).toEqual({ kind: "again", checkIn })
  })
  test("refuses a canceled ticket and the wrong day", () => {
    expect(scanDecision(form, makeResponse({ status: "cancelled" }), "d1").kind).toBe("refused")
    expect(scanDecision(form, makeResponse({ ticketTypeId: "day1" }), "d2")).toEqual({
      kind: "refused",
      reason: "wrong_day",
    })
  })
  test("starts on today's day, else the next", () => {
    expect(defaultDay(form, NOW)?.id).toBe("d1")
    expect(defaultDay(form, new Date("2027-03-18T09:00:00+08:00"))?.id).toBe("d2")
  })
  test("self-cancel until checked in or the event is over", () => {
    expect(canSelfCancel(form, makeResponse(), NOW)).toBe(true)
    expect(canSelfCancel(form, makeResponse({ checkIns: { d1: checkIn } }), NOW)).toBe(false)
    expect(canSelfCancel(form, makeResponse(), new Date("2027-03-19T00:00:00+08:00"))).toBe(false)
  })
})

describe("parseScan", () => {
  test("reads a ticket link, a token or a typed code", () => {
    const token = "abcdefghijklmnopqrstuvwx"
    expect(parseScan(`https://forms.ppitshenzhen.org/tickets/${token}`)).toEqual({ token })
    expect(parseScan(token)).toEqual({ token })
    expect(parseScan(" k7p-3qx ")).toEqual({ code: "K7P3QX" })
    expect(parseScan("hello")).toBeNull()
  })
})
