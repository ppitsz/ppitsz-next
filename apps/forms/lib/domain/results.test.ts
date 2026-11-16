import { describe, expect, test } from "bun:test"

import { makeResponse, makeTicketForm, NOW } from "./fixtures"
import { attendance, responsesCsv, summarize } from "./results"

const form = makeTicketForm()
const checkIn = { at: NOW, byUid: "u", byName: "Rina" }
const responses = [
  makeResponse({
    id: "a",
    answers: { role: "student", major: "Teknik", food: ["veg", "halal"] },
    checkIns: { d1: checkIn },
  }),
  makeResponse({ id: "b", ticketTypeId: "day1", answers: { role: "guest", host: 'Budi, "Sosbud"' } }),
  makeResponse({ id: "c", status: "cancelled", answers: { role: "guest" } }),
]

test("summary counts live answers per option", () => {
  const role = summarize(form, responses)[0]!
  expect(role.kind).toBe("choice")
  if (role.kind !== "choice") return
  expect(role.answered).toBe(2)
  expect(role.options.map((o) => o.count)).toEqual([1, 1])
})

test("attendance per type and day, with days a type doesn't cover left out", () => {
  const rows = attendance(form, responses)
  expect(rows.find((r) => r.typeId === "day1")?.perDay).toEqual({ d1: 0, d2: null })
  expect(rows.at(-1)).toEqual({ typeId: null, label: "All", tickets: 2, perDay: { d1: 1, d2: 0 } })
})

describe("csv", () => {
  test("has a BOM, quotes commas and quotes, one row per response", () => {
    const csv = responsesCsv(form, responses)
    expect(csv.startsWith("﻿Code,Status,Submitted,Name,Email,WeChat,Campus,Ticket type")).toBe(true)
    expect(csv).toContain('"Budi, ""Sosbud"""')
    expect(csv.trim().split("\r\n")).toHaveLength(4)
    expect(csv).toContain("2027-03-10 12:00")
  })
})
