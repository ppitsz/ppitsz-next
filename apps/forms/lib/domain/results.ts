import { CAMPUSES } from "@ppitsz/ui/lib/network"

import { allQuestions, answerText, isFileAnswer } from "./form"
import { daysOf } from "./tickets"
import type { Form, FormResponse, Question } from "./types"

/*
 * What organizers read after the event: a summary per question, the check-in
 * recap, and the CSV of every response. Pure, from the form and its
 * responses.
 */

/* -------------------------------------------------------------------------
   Per question
   ------------------------------------------------------------------------- */

export type QuestionSummary =
  | { kind: "choice"; question: Question; answered: number; options: { id: string; label: string; count: number }[] }
  | { kind: "text"; question: Question; answered: number; latest: string[] }
  | { kind: "file"; question: Question; answered: number }

/** How many text answers the summary lists; the CSV has every one. */
export const TEXT_SAMPLE = 30

export function summarize(form: Form, responses: FormResponse[]): QuestionSummary[] {
  const live = responses.filter((r) => r.status === "live").sort((a, b) => +b.createdAt - +a.createdAt)
  return allQuestions(form).map((question): QuestionSummary => {
    const answers = live.map((r) => r.answers[question.id]).filter((a) => a !== undefined)
    if (question.type === "single" || question.type === "multi") {
      const counts = new Map<string, number>()
      for (const a of answers) for (const id of Array.isArray(a) ? a : [a as string]) counts.set(id, (counts.get(id) ?? 0) + 1)
      return {
        kind: "choice",
        question,
        answered: answers.length,
        options: question.options.map((o) => ({ ...o, count: counts.get(o.id) ?? 0 })),
      }
    }
    if (question.type === "file") return { kind: "file", question, answered: answers.filter(isFileAnswer).length }
    return {
      kind: "text",
      question,
      answered: answers.length,
      latest: answers.slice(0, TEXT_SAMPLE).map((a) => String(a)),
    }
  })
}

/* -------------------------------------------------------------------------
   Check-in
   ------------------------------------------------------------------------- */

export interface AttendanceRow {
  /** null for the total row. */
  typeId: string | null
  label: string
  /** Live tickets of this type. */
  tickets: number
  /** Per day id: checked in, or null where the type doesn't get in that day. */
  perDay: Record<string, number | null>
}

export function attendance(form: Form, responses: FormResponse[]): AttendanceRow[] {
  const live = responses.filter((r) => r.status === "live")
  const days = form.tickets.days
  const rows = form.tickets.types.map((type): AttendanceRow => {
    const holders = live.filter((r) => r.ticketTypeId === type.id)
    const valid = new Set(daysOf(form, type.id).map((d) => d.id))
    return {
      typeId: type.id,
      label: type.name,
      tickets: holders.length,
      perDay: Object.fromEntries(
        days.map((d) => [d.id, valid.has(d.id) ? holders.filter((r) => r.checkIns[d.id]).length : null])
      ),
    }
  })
  const total: AttendanceRow = {
    typeId: null,
    label: "All",
    tickets: live.length,
    perDay: Object.fromEntries(days.map((d) => [d.id, live.filter((r) => r.checkIns[d.id]).length])),
  }
  return [...rows, total]
}

/** Live tickets valid on `dayId`: what that day's attendance is out of. */
export function expectedOn(form: Form, responses: FormResponse[], dayId: string) {
  return responses.filter((r) => r.status === "live" && daysOf(form, r.ticketTypeId).some((d) => d.id === dayId))
    .length
}

/* -------------------------------------------------------------------------
   CSV
   ------------------------------------------------------------------------- */

const STATUS_TEXT = { live: "Live", cancelled: "Canceled" } as const

export function campusName(id: string) {
  if (id === "other") return "Other campus"
  return CAMPUSES.find((c) => c.id === id)?.name ?? ""
}

function cell(value: string | number) {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Shenzhen time as "2027-03-17 19:02", which spreadsheets read as a date. */
function stamp(date: Date | null | undefined) {
  return date ? new Date(date.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 16).replace("T", " ") : ""
}

/**
 * Every response, one row each, oldest first: UTF-8 with a BOM and commas,
 * like the shop's exports. Files are listed by name; staff open them in the app.
 */
export function responsesCsv(form: Form, responses: FormResponse[]) {
  const questions = allQuestions(form)
  const { collectEmail, collectContact } = form.tickets.enabled
    ? { collectEmail: true, collectContact: true }
    : form.settings
  const typeName = new Map(form.tickets.types.map((t) => [t.id, t.name]))

  const head = [
    "Code",
    "Status",
    "Submitted",
    ...(collectEmail ? ["Name", "Email"] : []),
    ...(collectContact ? ["WeChat", "Campus"] : []),
    ...(form.tickets.enabled ? ["Ticket type", "Walk-in sign-up", ...form.tickets.days.map((d) => `Check-in ${d.date}`)] : []),
    ...questions.map((q) => q.title),
  ]
  const rows = [...responses]
    .sort((a, b) => +a.createdAt - +b.createdAt)
    .map((r) => [
      r.code,
      STATUS_TEXT[r.status],
      stamp(r.createdAt),
      ...(collectEmail ? [r.identity.name, r.identity.email] : []),
      ...(collectContact ? [r.identity.wechatId, campusName(r.identity.campus)] : []),
      ...(form.tickets.enabled
        ? [
            typeName.get(r.ticketTypeId ?? "") ?? "",
            r.source === "door" ? "Yes" : "",
            ...form.tickets.days.map((d) => stamp(r.checkIns[d.id]?.at)),
          ]
        : []),
      ...questions.map((q) => answerText(q, r.answers[q.id])),
    ])
  return "﻿" + [head, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
}
