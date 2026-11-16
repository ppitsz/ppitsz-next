/*
 * Expected failures carry a code the UI turns into a sentence; anything else
 * is a bug and surfaces as a generic error.
 */

export const ERROR_MESSAGES = {
  NOT_FOUND: "Form not found.",
  RESPONSE_NOT_FOUND: "Response not found.",
  NOT_OPEN: "This form isn't open yet.",
  CLOSED: "This form has closed.",
  FULL: "It's fully booked.",
  TYPE_UNAVAILABLE: "This ticket type is full or not on sale right now. Choose another one.",
  ALREADY_RESPONDED: "This email has already responded to this form.",
  ALREADY_RESPONDED_DEVICE: "You've already filled in this form on this device.",
  INVALID_ANSWERS: "Some answers aren't right yet. Check the marked ones again.",
  NOT_EDITABLE: "Answers to this form can no longer be edited.",
  CANCELLED: "This response has been canceled.",
  CANNOT_CANCEL: "You can no longer cancel this ticket yourself. Contact us.",
  INVALID_FILE: "Upload a JPG, PNG or WebP image, or a PDF, up to 4 MB.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes, then try again.",
  INVALID_FORM: "The form settings aren't right yet.",
  SLUG_TAKEN: "This address is already used by another form.",
  TYPE_IN_USE: "A ticket type that has tickets can't be deleted.",
  DAY_IN_USE: "A day with check-ins can't be deleted.",
  QUOTA_BELOW_LIVE: "The quota can't be less than the tickets already taken.",
  NOT_ALLOWED: "You don't have access to this.",
  WRONG_CODE: "The code is wrong or has expired.",
  NO_EMAIL: "This response has no email.",
  EVENT_CANCELLED: "This event has been canceled.",
  MESSAGE_REQUIRED: "Write the announcement's subject and text.",
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

export class FormError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, detail?: string) {
    super(detail ? `${ERROR_MESSAGES[code]} ${detail}` : ERROR_MESSAGES[code])
    this.name = "FormError"
    this.code = code
  }
}

export function isFormError(error: unknown): error is FormError {
  return error instanceof FormError
}
