import { describe, expect, test } from "bun:test"

import { checkAnswers, checkIdentity, formPhase, isValidSlug, slugify, visibleQuestions } from "./form"
import { makeForm, makeTicketForm, NOW, SECTIONS } from "./fixtures"

describe("addresses", () => {
  test("slugify makes a valid address", () => {
    expect(slugify("Gala Night 2027!")).toBe("gala-night-2027")
    expect(slugify("Lomba Masak — Édisi Ramadan")).toBe("lomba-masak-edisi-ramadan")
    expect(slugify("???")).toBe("form")
  })
  test("app paths are reserved", () => {
    expect(isValidSlug("staff")).toBe(false)
    expect(isValidSlug("tickets")).toBe(false)
    expect(isValidSlug("gala-night")).toBe(true)
    expect(isValidSlug("-gala")).toBe(false)
  })
})

describe("formPhase", () => {
  test("follows the dates and caps of an open form", () => {
    expect(formPhase(makeForm({ status: "draft" }), NOW)).toBe("draft")
    expect(formPhase(makeForm({ opensAt: new Date(NOW.getTime() + 1) }), NOW)).toBe("upcoming")
    expect(formPhase(makeForm({ closesAt: NOW }), NOW)).toBe("ended")
    expect(formPhase(makeForm(), NOW)).toBe("open")
    const capped = makeForm({
      settings: { ...makeForm().settings, maxResponses: 2 },
      counts: { total: 3, live: 2, byType: {} },
    })
    expect(formPhase(capped, NOW)).toBe("full")
  })
  test("a ticket form is full when every type is capped and taken", () => {
    const form = makeTicketForm()
    const types = form.tickets.types.map((t) => ({ ...t, quota: 1 }))
    const full = makeTicketForm({
      tickets: { ...form.tickets, types },
      counts: { total: 2, live: 2, byType: { all: 1, day1: 1 } },
    })
    expect(formPhase(full, NOW)).toBe("full")
  })
})

describe("conditions", () => {
  test("hide sections and questions until their choice is picked", () => {
    const shown = (answers: Record<string, string>) =>
      visibleQuestions(SECTIONS, answers).flatMap(({ questions }) => questions.map((q) => q.id))
    expect(shown({})).toEqual(["role", "food", "note", "cv"])
    expect(shown({ role: "student" })).toEqual(["role", "major", "food", "note", "cv"])
    expect(shown({ role: "guest" })).toEqual(["role", "food", "host", "note", "cv"])
  })
})

describe("checkAnswers", () => {
  test("requires what is shown and drops what is hidden", () => {
    const result = checkAnswers(SECTIONS, { values: { role: "guest", major: "Teknik", host: "" }, files: {} })
    expect(result.errors).toEqual({ host: "This question is required." })
    expect(result.answers.major).toBeUndefined()
  })
  test("keeps valid choices, rejects unknown ones", () => {
    const ok = checkAnswers(SECTIONS, {
      values: { role: "student", major: "  Teknik   Sipil ", food: ["halal"] },
      files: {},
    })
    expect(ok.errors).toEqual({})
    expect(ok.answers).toEqual({ role: "student", major: "Teknik Sipil", food: ["halal"] })
    const bad = checkAnswers(SECTIONS, { values: { role: "teacher" }, files: {} })
    expect(bad.errors.role).toBeDefined()
  })
  test("files: a new one is uploaded, an old one kept, a wrong type refused", () => {
    const values = { role: "student", major: "x" }
    const pdf = { name: "cv.pdf", size: 1000, contentType: "application/pdf" }
    expect(checkAnswers(SECTIONS, { values, files: { cv: pdf } }).uploads).toEqual(["cv"])
    const kept = { path: "p", name: "old.pdf", contentType: "application/pdf", size: 9 }
    expect(checkAnswers(SECTIONS, { values, files: {} }, { cv: kept }).answers.cv).toEqual(kept)
    const exe = { name: "a.exe", size: 10, contentType: "application/x-msdownload" }
    expect(checkAnswers(SECTIONS, { values, files: { cv: exe } }).errors.cv).toBeDefined()
  })
})

describe("checkIdentity", () => {
  test("asks a ticket form for everything, an anonymous form for nothing", () => {
    const ticket = checkIdentity(makeTicketForm({ settings: { ...makeForm().settings, collectEmail: false } }), {})
    expect(Object.keys(ticket.errors).sort()).toEqual(["campus", "email", "name", "wechatId"])
    const anon = makeForm({ settings: { ...makeForm().settings, collectEmail: false, collectContact: false } })
    expect(checkIdentity(anon, { name: "x" }).identity).toEqual({ name: "", email: "", wechatId: "", campus: "" })
  })
  test("normalizes the email", () => {
    const { identity, errors } = checkIdentity(makeTicketForm(), {
      name: " Nadia ",
      email: " Nadia@Contoh.TEST ",
      wechatId: "n",
      campus: "other",
    })
    expect(errors).toEqual({})
    expect(identity.email).toBe("nadia@contoh.test")
    expect(identity.campus).toBe("other")
  })
})
