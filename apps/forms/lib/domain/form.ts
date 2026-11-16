import { CAMPUS_IDS } from "@ppitsz/ui/lib/network"

import type {
  Answers,
  Condition,
  FileAnswer,
  Form,
  FormSettings,
  Identity,
  Question,
  Section,
  TicketSettings,
} from "./types"
import { FILE_TYPES, UPLOAD_MAX_BYTES } from "./files"

/*
 * Form rules: where a form stands, which questions a responder sees, and
 * whether a response's answers are complete. Shared by the form page (which
 * hides and checks as the responder types) and the server (which decides).
 */

/* -------------------------------------------------------------------------
   Addresses
   ------------------------------------------------------------------------- */

/** First-level paths the app uses itself. */
export const RESERVED_SLUGS = new Set(["staff", "media", "api", "tickets", "responses", "_next", "favicon.ico"])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)
}

/** "Gala Night 2027!" → "gala-night-2027" */
export function slugify(text: string) {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "") || "form"
  )
}

/* -------------------------------------------------------------------------
   Where a form stands
   ------------------------------------------------------------------------- */

/**
 * `upcoming`, `open` and `full` are an open form's phases; `ended` is an
 * open form past its close date.
 */
export type FormPhase = "draft" | "upcoming" | "open" | "full" | "ended" | "closed" | "done"

export function formPhase(form: Form, now: Date): FormPhase {
  if (form.status !== "open") return form.status
  if (form.opensAt && now < form.opensAt) return "upcoming"
  if (form.closesAt && now >= form.closesAt) return "ended"
  if (isFull(form)) return "full"
  return "open"
}

export function acceptsResponses(form: Form, now: Date) {
  return formPhase(form, now) === "open"
}

/** No room left for one more live response, ticket caps included. */
export function isFull(form: Form) {
  const { settings, tickets, counts } = form
  if (settings.maxResponses !== null && counts.live >= settings.maxResponses) return true
  if (!tickets.enabled) return false
  if (tickets.capacity !== null && counts.live >= tickets.capacity) return true
  // Every type capped and taken.
  return (
    tickets.types.length > 0 &&
    tickets.types.every((t) => t.quota !== null && (counts.byType[t.id] ?? 0) >= t.quota)
  )
}

/** Ticket forms always collect email and allow one ticket per email. */
export function effectiveSettings(settings: FormSettings, tickets: TicketSettings): FormSettings {
  if (!tickets.enabled) return settings
  return { ...settings, collectEmail: true, collectContact: true, oneResponse: true }
}

/** Organizers may work on a form until it has ended; admins always. */
export function teamMayAccess(form: Form) {
  return form.status !== "done"
}

/* -------------------------------------------------------------------------
   Which questions show
   ------------------------------------------------------------------------- */

export function conditionMet(condition: Condition | undefined, answers: Answers) {
  if (!condition) return true
  const answer = answers[condition.questionId]
  const picked = typeof answer === "string" ? [answer] : Array.isArray(answer) ? answer : []
  return picked.some((id) => condition.optionIds.includes(id))
}

/**
 * The sections and questions shown for these answers. A condition can only
 * name an earlier question, so one pass in order settles every one of them:
 * an answer to a hidden question never counts.
 */
export function visibleQuestions(sections: Section[], answers: Answers) {
  const shown: Answers = {}
  const result: { section: Section; questions: Question[] }[] = []
  for (const section of sections) {
    if (!conditionMet(section.showIf, shown)) continue
    const questions: Question[] = []
    for (const q of section.questions) {
      if (!conditionMet(q.showIf, shown)) continue
      questions.push(q)
      if (answers[q.id] !== undefined) shown[q.id] = answers[q.id]!
    }
    result.push({ section, questions })
  }
  return result
}

/** The choice questions before `questionId`: what a condition may name. */
export function earlierChoiceQuestions(sections: Section[], beforeId: string) {
  const result: Question[] = []
  for (const section of sections) {
    if (section.id === beforeId) return result
    for (const q of section.questions) {
      if (q.id === beforeId) return result
      if (q.type === "single" || q.type === "multi") result.push(q)
    }
  }
  return result
}

/* -------------------------------------------------------------------------
   Checking a response
   ------------------------------------------------------------------------- */

export const LIMITS = {
  name: 100,
  email: 200,
  wechatId: 60,
  short: 300,
  long: 5000,
} as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isEmail(email: string) {
  return email.length <= LIMITS.email && EMAIL_PATTERN.test(email)
}

export type FieldErrors = Record<string, string>

/** Checks the fixed fields this form asks for. Keys: name, email, wechatId, campus. */
export function checkIdentity(form: Pick<Form, "settings" | "tickets">, raw: Partial<Identity>) {
  const settings = effectiveSettings(form.settings, form.tickets)
  const errors: FieldErrors = {}
  const identity: Identity = { name: "", email: "", wechatId: "", campus: "" }
  if (settings.collectEmail) {
    identity.name = (raw.name ?? "").trim().replace(/\s+/g, " ")
    identity.email = normalizeEmail(raw.email ?? "")
    if (!identity.name) errors.name = "Write your name."
    else if (identity.name.length > LIMITS.name) errors.name = `At most ${LIMITS.name} characters.`
    if (!identity.email) errors.email = "Write your email. A copy of your ticket and the link to your answers are sent here."
    else if (!isEmail(identity.email)) errors.email = "This email isn't valid."
  }
  if (settings.collectContact) {
    identity.wechatId = (raw.wechatId ?? "").trim()
    const campus = raw.campus ?? ""
    if (!identity.wechatId) errors.wechatId = "Write your WeChat ID."
    else if (identity.wechatId.length > LIMITS.wechatId) errors.wechatId = `At most ${LIMITS.wechatId} characters.`
    if (campus === "other" || (CAMPUS_IDS as readonly string[]).includes(campus)) {
      identity.campus = campus as Identity["campus"]
    } else errors.campus = "Choose your campus."
  }
  return { identity, errors }
}

/** A file the responder picked, before it is stored. */
export interface PickedFile {
  name: string
  size: number
  contentType: string
}

export interface AnswerInput {
  /** Text answers and picked option ids, by question id. */
  values: Record<string, string | string[]>
  /** Newly picked files, by question id. */
  files: Record<string, PickedFile>
}

export function fileProblem(file: PickedFile): string | null {
  if (!FILE_TYPES[file.contentType] || file.size === 0 || file.size > UPLOAD_MAX_BYTES) {
    return "Upload a JPG, PNG or WebP image, or a PDF, up to 4 MB."
  }
  return null
}

/**
 * Checks the answers against the form. Returns the answers to store (text
 * and choices, plus files kept from `previous`), the questions whose new
 * file must be uploaded, and an error per question id. Hidden questions are
 * dropped, so a changed choice can't leave a stale answer behind.
 */
export function checkAnswers(sections: Section[], input: AnswerInput, previous: Answers = {}) {
  const errors: FieldErrors = {}
  const draft: Answers = {}

  // First the raw values, so conditions see every choice.
  for (const section of sections) {
    for (const q of section.questions) {
      const value = input.values[q.id]
      if (q.type === "single" && typeof value === "string" && value) draft[q.id] = value
      if (q.type === "multi") {
        const list = (Array.isArray(value) ? value : typeof value === "string" && value ? [value] : []).filter(Boolean)
        if (list.length) draft[q.id] = list
      }
    }
  }

  const answers: Answers = {}
  const uploads: string[] = []
  for (const { questions } of visibleQuestions(sections, draft)) {
    for (const q of questions) {
      const value = input.values[q.id]
      const text = typeof value === "string" ? value.trim() : ""
      switch (q.type) {
        case "short":
        case "long": {
          const max = LIMITS[q.type]
          if (text.length > max) errors[q.id] = `At most ${max} characters.`
          else if (text) answers[q.id] = q.type === "short" ? text.replace(/\s+/g, " ") : text
          break
        }
        case "single": {
          const picked = draft[q.id] as string | undefined
          if (picked && !q.options.some((o) => o.id === picked)) errors[q.id] = "Choose one of the options."
          else if (picked) answers[q.id] = picked
          break
        }
        case "multi": {
          const picked = (draft[q.id] as string[] | undefined) ?? []
          const valid = q.options.filter((o) => picked.includes(o.id)).map((o) => o.id)
          if (valid.length !== new Set(picked).size) errors[q.id] = "That option doesn't exist."
          else if (valid.length) answers[q.id] = valid
          break
        }
        case "file": {
          const file = input.files[q.id]
          const problem = file && fileProblem(file)
          if (problem) errors[q.id] = problem
          else if (file) uploads.push(q.id)
          else if (isFileAnswer(previous[q.id])) answers[q.id] = previous[q.id]!
          break
        }
      }
      const answered = answers[q.id] !== undefined || uploads.includes(q.id)
      if (q.required && !answered && !errors[q.id]) {
        errors[q.id] = q.type === "single" || q.type === "multi" ? "Choose your answer." : "This question is required."
      }
    }
  }
  return { answers, uploads, errors }
}

export function isFileAnswer(answer: unknown): answer is FileAnswer {
  return typeof answer === "object" && answer !== null && !Array.isArray(answer) && "path" in answer
}

/** An answer as one line of text: option labels for choices, the file name for a file. */
export function answerText(question: Question, answer: Answers[string] | undefined) {
  if (answer === undefined) return ""
  if (isFileAnswer(answer)) return answer.name
  const label = (id: string) => question.options.find((o) => o.id === id)?.label ?? "(deleted option)"
  if (Array.isArray(answer)) return answer.map(label).join(", ")
  return question.type === "single" ? label(answer) : answer
}

export function allQuestions(form: Pick<Form, "sections">) {
  return form.sections.flatMap((s) => s.questions)
}
