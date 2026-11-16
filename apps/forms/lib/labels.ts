import { CAMPUSES } from "@ppitsz/ui/lib/network"

import type { FormPhase } from "./domain/form"
import type { MailStatus, QuestionType } from "./domain/types"

/** Words for values the app shows, safe to import from client components. */

/** A form phase as a status badge value (packages/ui STATUSES.form). */
export const PHASE_BADGE: Record<FormPhase, "draft" | "open" | "closed" | "done" | "upcoming" | "full" | "ended"> = {
  draft: "draft",
  upcoming: "upcoming",
  open: "open",
  full: "full",
  ended: "ended",
  closed: "closed",
  done: "done",
}

export const MAIL_LABELS: Record<MailStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  delayed: "Delayed",
  bounced: "Bounced",
  complained: "Marked as spam",
  failed: "Failed",
}

/** Problems organizers should fix: wrong address, or a block on our side. */
export const MAIL_PROBLEMS: readonly MailStatus[] = ["bounced", "complained", "failed"]

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: "Short answer",
  long: "Paragraph",
  single: "Multiple choice (one)",
  multi: "Checkboxes (several)",
  file: "File upload",
}

/** "CUHK-Shenzhen 香港中文大学（深圳）": campus options show both names. */
export const CAMPUS_OPTIONS = [
  ...CAMPUSES.map((c) => ({ value: c.id, label: `${c.name} ${c.zh}` })),
  { value: "other", label: "Other campus" },
]
