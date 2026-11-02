import type { BuyerMessage } from "../buyer-message"
import { isShopError, type ErrorCode } from "../domain/errors"
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
  /** The saved record, so a new one's page can open. */
  id?: string
  /** Text for staff to paste to the buyer over WeChat. */
  buyerMessage?: BuyerMessage
}

/** The sentence for `error`: its own message when expected, a generic one for a bug. */
export function messageOf(error: unknown) {
  if (isShopError(error)) return error.message
  reportError(error, "server action")
  return "Something went wrong on the server. Try again in a moment."
}

/** `error` as an action state; the codes in `fields` show next to that form field instead. */
export function failure(error: unknown, fields: Partial<Record<ErrorCode, string>> = {}): ActionState {
  const field = isShopError(error) ? fields[error.code] : undefined
  return field ? { fieldErrors: { [field]: messageOf(error) } } : { error: messageOf(error) }
}
