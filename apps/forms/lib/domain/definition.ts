import { LINE_CODES } from "@ppitsz/ui/lib/network"
import { z } from "zod"

import { fromShenzhenInput, toShenzhenInput } from "../shenzhen-time"
import { newId } from "./codes"
import { FormError } from "./errors"
import { isValidSlug } from "./form"
import type { Condition, Form, FormSettings, Section, TicketSettings } from "./types"

/*
 * A form's definition as the builder edits it: everything an admin sets,
 * as plain JSON, with times as Shenzhen "YYYY-MM-DDTHH:MM" strings. The
 * server parses it with the same schema and checks it against the stored
 * form, so a save never strands a response.
 */

const text = (max: number) => z.string().trim().max(max)
const id = z.string().regex(/^[a-z0-9]{1,16}$/)
const count = z.number().int().min(1).max(100_000).nullable()
const time = z.string().regex(/^(\d{2}:\d{2})?$/)
const when = z.string().regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/)

const condition = z.object({ questionId: id, optionIds: z.array(id).min(1) }).optional()

const question = z.object({
  id,
  type: z.enum(["short", "long", "single", "multi", "file"]),
  title: text(300).min(1, "Write the question."),
  help: text(1000),
  required: z.boolean(),
  options: z.array(z.object({ id, label: text(200).min(1, "Write every option.") })).max(50),
  showIf: condition,
})

const section = z.object({
  id,
  title: text(200),
  description: text(2000),
  questions: z.array(question).max(100),
  showIf: condition,
})

export const draftSchema = z.object({
  title: text(120).min(1, "Write the form's title."),
  slug: z.string().trim().toLowerCase(),
  description: text(5000),
  line: z.enum(LINE_CODES),
  unlisted: z.boolean(),
  opensAt: when,
  closesAt: when,
  settings: z.object({
    collectEmail: z.boolean(),
    collectContact: z.boolean(),
    oneResponse: z.boolean(),
    editable: z.boolean(),
    maxResponses: count,
  }),
  sections: z.array(section).min(1).max(30),
  tickets: z.object({
    enabled: z.boolean(),
    venue: text(300),
    capacity: count,
    days: z
      .array(z.object({ id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fill in the date."), starts: time, ends: time }))
      .max(14),
    types: z
      .array(
        z.object({
          id,
          name: text(80).min(1, "Write the ticket type's name."),
          description: text(500),
          quota: count,
          salesStart: when,
          salesEnd: when,
          dayIds: z.array(id),
        })
      )
      .max(20),
  }),
})

export type FormDraft = z.input<typeof draftSchema>

/** The parts of a Form a save replaces. */
export type Definition = Pick<
  Form,
  "title" | "slug" | "description" | "line" | "unlisted" | "opensAt" | "closesAt" | "settings" | "sections" | "tickets"
>

export function toDraft(form: Definition): FormDraft {
  const at = (d: Date | null) => (d ? toShenzhenInput(d) : "")
  return {
    title: form.title,
    slug: form.slug,
    description: form.description,
    line: form.line,
    unlisted: form.unlisted,
    opensAt: at(form.opensAt),
    closesAt: at(form.closesAt),
    settings: form.settings,
    sections: form.sections,
    tickets: {
      ...form.tickets,
      types: form.tickets.types.map((t) => ({ ...t, salesStart: at(t.salesStart), salesEnd: at(t.salesEnd) })),
    },
  }
}

/** A blank first section, for a new form. */
export function blankSection(): Section {
  return { id: newId(), title: "", description: "", questions: [] }
}

export const DEFAULT_SETTINGS: FormSettings = {
  collectEmail: true,
  collectContact: true,
  oneResponse: true,
  editable: true,
  maxResponses: null,
}

export const NO_TICKETS: TicketSettings = { enabled: false, venue: "", capacity: null, days: [], types: [] }

export type DraftResult = { ok: true; definition: Definition } | { ok: false; error: string }

/**
 * Parses and checks a builder save. `current` is the stored form, for the
 * rules about what responses already use; null for a new form.
 */
export function parseDraft(input: unknown, current: Form | null): DraftResult {
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue?.message && !issue.message.startsWith("Invalid") ? issue.message : "The form settings aren't right yet." }
  }
  const d = parsed.data
  if (!isValidSlug(d.slug)) {
    return { ok: false, error: "The address can only have lowercase letters, numbers and hyphens, and can't be a word the app uses (staff, tickets, …)." }
  }
  const opensAt = fromShenzhenInput(d.opensAt)
  const closesAt = fromShenzhenInput(d.closesAt)
  if (opensAt && closesAt && closesAt <= opensAt) return { ok: false, error: "The close date must be after the open date." }

  const problem = checkStructure(d.sections) ?? checkTickets(d.tickets)
  if (problem) return { ok: false, error: problem }

  const definition: Definition = {
    title: d.title,
    slug: d.slug,
    description: d.description,
    line: d.line,
    unlisted: d.unlisted,
    opensAt,
    closesAt,
    settings: d.settings,
    sections: d.sections.map((s) => ({
      ...s,
      showIf: s.showIf,
      questions: s.questions.map((q) => ({
        ...q,
        options: q.type === "single" || q.type === "multi" ? q.options : [],
      })),
    })),
    tickets: {
      ...d.tickets,
      types: d.tickets.types.map((t) => ({
        ...t,
        salesStart: fromShenzhenInput(t.salesStart),
        salesEnd: fromShenzhenInput(t.salesEnd),
        dayIds: t.dayIds.filter((dayId) => d.tickets.days.some((day) => day.id === dayId)),
      })),
    },
  }
  if (current) {
    try {
      assertKeepsResponses(current, definition)
    } catch (error) {
      if (error instanceof FormError) return { ok: false, error: error.message }
      throw error
    }
  }
  return { ok: true, definition }
}

/** Unique ids, choices with options, and conditions that point back to an earlier choice. */
function checkStructure(sections: Section[]): string | null {
  const seen = new Set<string>()
  const choices = new Map<string, Set<string>>()
  const check = (c: Condition | undefined) =>
    !c || (choices.has(c.questionId) && c.optionIds.every((o) => choices.get(c.questionId)!.has(o)))

  for (const section of sections) {
    if (seen.has(section.id)) return "A section appears twice. Reload the page."
    seen.add(section.id)
    if (!check(section.showIf)) return `The condition of section "${section.title || "untitled"}" must use an earlier choice question.`
    for (const q of section.questions) {
      if (seen.has(q.id)) return "A question appears twice. Reload the page."
      seen.add(q.id)
      if (!check(q.showIf)) return `The condition of question "${q.title}" must use an earlier choice question.`
      if (q.type === "single" || q.type === "multi") {
        if (q.options.length < 2) return `The question "${q.title}" needs at least two options.`
        choices.set(q.id, new Set(q.options.map((o) => o.id)))
      }
    }
  }
  return null
}

function checkTickets(tickets: z.output<typeof draftSchema>["tickets"]): string | null {
  if (!tickets.enabled) return null
  if (tickets.days.length === 0) return "Add at least one event day."
  if (tickets.types.length === 0) return "Add at least one ticket type."
  if (new Set(tickets.days.map((d) => d.date)).size !== tickets.days.length) return "An event date appears twice."
  for (const t of tickets.types) {
    const start = fromShenzhenInput(t.salesStart)
    const end = fromShenzhenInput(t.salesEnd)
    if (start && end && end <= start) return `Sales of "${t.name}" must end after they start.`
  }
  return null
}

/** Ticket types with tickets, days with check-ins and quotas below what is taken can't go. */
function assertKeepsResponses(current: Form, next: Definition) {
  const nextTypes = new Map(next.tickets.types.map((t) => [t.id, t]))
  for (const [typeId, taken] of Object.entries(current.counts.byType)) {
    if (taken === 0) continue
    const type = nextTypes.get(typeId)
    if (!type || !next.tickets.enabled) throw new FormError("TYPE_IN_USE")
    if (type.quota !== null && type.quota < taken) throw new FormError("QUOTA_BELOW_LIVE")
  }
  if (next.tickets.capacity !== null && next.tickets.enabled && next.tickets.capacity < current.counts.live) {
    throw new FormError("QUOTA_BELOW_LIVE")
  }
  if (next.settings.maxResponses !== null && next.settings.maxResponses < current.counts.live) {
    throw new FormError("QUOTA_BELOW_LIVE")
  }
  const keptDays = new Set(next.tickets.days.map((d) => d.id))
  for (const dayId of current.checkInDays) {
    if (!keptDays.has(dayId)) throw new FormError("DAY_IN_USE")
  }
}
