import type { CampusId, LineCode } from "@ppitsz/ui/lib/network"

/*
 * The Forms domain (GLOSSARY.md, Forms). A form collects responses; with
 * tickets turned on, each live response is also one person's ticket, with a
 * QR code organizers scan for check-in.
 */

/* -------------------------------------------------------------------------
   Forms
   ------------------------------------------------------------------------- */

/**
 * What a form admin sets. `closed` stops new responses but tickets still
 * scan; `done` ends organizer access and starts the 90-day purge clock.
 */
export const FORM_STATUSES = ["draft", "open", "closed", "done"] as const
export type FormStatus = (typeof FORM_STATUSES)[number]

export const QUESTION_TYPES = ["short", "long", "single", "multi", "file"] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export interface Option {
  id: string
  label: string
}

/** Shown only when an earlier choice question's answer includes one of `optionIds`. */
export interface Condition {
  questionId: string
  optionIds: string[]
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  help: string
  required: boolean
  /** Choices, for `single` and `multi`. */
  options: Option[]
  showIf?: Condition
}

/** One page of the form. */
export interface Section {
  id: string
  title: string
  description: string
  questions: Question[]
  showIf?: Condition
}

export interface FormSettings {
  /** Asks for name and email. Off: the form is anonymous. */
  collectEmail: boolean
  /** Also asks for WeChat ID and campus. */
  collectContact: boolean
  /** One live response per email, or per device for an anonymous form. */
  oneResponse: boolean
  /** Responders may change their answers until the form closes. */
  editable: boolean
  /** At most this many live responses. */
  maxResponses: number | null
}

/** A day of the event; a check-in is recorded once per day. */
export interface EventDay {
  id: string
  /** "2027-03-17", Shenzhen calendar date. */
  date: string
  /** "19:00", optional. */
  starts: string
  ends: string
}

export interface TicketType {
  id: string
  name: string
  description: string
  /** At most this many live tickets of this type. */
  quota: number | null
  salesStart: Date | null
  salesEnd: Date | null
  /** The days this type gets in on. Empty: every day. */
  dayIds: string[]
}

export interface TicketSettings {
  enabled: boolean
  venue: string
  days: EventDay[]
  /** At most this many live tickets of all types together. */
  capacity: number | null
  types: TicketType[]
}

export interface TeamMember {
  uid: string
  email: string
  name: string
}

/** An announcement: a change or cancellation email organizers sent to every live ticket. */
export interface Broadcast {
  id: string
  kind: "change" | "cancel"
  subject: string
  body: string
  sentAt: Date
  byName: string
  recipients: number
}

export interface FormCounts {
  /** Every response ever made, canceled ones included. */
  total: number
  /** Responses not canceled: what the caps count. */
  live: number
  /** Live tickets per ticket type. */
  byType: Record<string, number>
}

export interface Form {
  id: string
  /** The address: forms.ppitshenzhen.org/<slug>. */
  slug: string
  title: string
  description: string
  coverPath?: string
  /** The organizing division: one accent line on the form and its tickets. */
  line: LineCode
  status: FormStatus
  /** Open forms are listed on the home page unless unlisted. */
  unlisted: boolean
  opensAt: Date | null
  closesAt: Date | null
  settings: FormSettings
  sections: Section[]
  tickets: TicketSettings
  team: TeamMember[]
  /** The team's uids, for an array-contains query. */
  teamUids: string[]
  counts: FormCounts
  /** Event days that have any check-in, which keeps them from being deleted. */
  checkInDays: string[]
  /** Per staff uid: how many responses they had seen. */
  seen: Record<string, number>
  broadcasts: Broadcast[]
  /** Set when organizers canceled the event. */
  cancelledAt: Date | null
  doneAt: Date | null
  purgedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/* -------------------------------------------------------------------------
   Responses
   ------------------------------------------------------------------------- */

export interface FileAnswer {
  path: string
  name: string
  contentType: string
  size: number
}

export type Answer = string | string[] | FileAnswer
export type Answers = Record<string, Answer>

export interface Identity {
  name: string
  email: string
  wechatId: string
  /** A campus id, "other", or "" when not asked. */
  campus: CampusId | "other" | ""
}

export interface CheckIn {
  at: Date
  byUid: string
  byName: string
}

/** What Resend last said about the ticket or confirmation email. */
export const MAIL_STATUSES = ["queued", "sent", "delivered", "delayed", "bounced", "complained", "failed"] as const
export type MailStatus = (typeof MAIL_STATUSES)[number]

export interface MailState {
  status: MailStatus
  at: Date
  detail?: string
}

export interface FormResponse {
  id: string
  formId: string
  /** The secret in the response's link and its ticket QR. */
  token: string
  /** Short code organizers can type when a QR won't scan: "K7P3QX". */
  code: string
  status: "live" | "cancelled"
  identity: Identity
  answers: Answers
  ticketTypeId: string | null
  /** Per event day id. */
  checkIns: Record<string, CheckIn>
  mail: MailState | null
  /** "online" from the form; "door" added at the scanner (walk-in sign-up). */
  source: "online" | "door"
  /** Hash of the device cookie, for anonymous one-response forms. */
  deviceKey: string
  /** The PPITSZ account that sent it while signed in (ADR 0008). Never set on an anonymous form. */
  accountUid: string | null
  cancelledAt: Date | null
  /** "self", "organizer" or "event" (the whole event was canceled). */
  cancelledBy: "self" | "organizer" | "event" | null
  createdAt: Date
  updatedAt: Date
}
