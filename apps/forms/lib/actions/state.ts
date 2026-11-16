import { isFormError } from "../domain/errors"
import { reportError } from "../server/alerts"

/*
 * What every form-backed server action returns. The rules live in the domain
 * and the store; an action only parses its input, calls them, and turns
 * their errors into this.
 */

export interface ActionState {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
  /** Set on success, so the client can close its dialog and say so. */
  done?: number
  /** A sentence to show on success. */
  message?: string
  /** On the emulator only: the link an email would have carried. */
  devLink?: string
}

/** The sentence for `error`: its own message when expected, a generic one for a bug. */
export function messageOf(error: unknown) {
  if (isFormError(error)) return error.message
  reportError(error, "server action")
  return "Something went wrong on the server. Try again in a moment."
}

export function failure(error: unknown): ActionState {
  return { error: messageOf(error) }
}

export const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim()
