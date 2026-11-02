import { RoleError } from "@ppitsz/accounts/roles"

/*
 * What every form-backed server action returns. An action only parses its
 * input, calls @ppitsz/accounts, and turns its errors into this.
 */

export interface ActionState {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
  /** Set on success, so the client can say so. */
  done?: number
  message?: string
  /** A new password, shown once for the Portal admin to copy into WeChat. */
  password?: string
  /** The account the action made or changed, so its page can open. */
  uid?: string
  /** Development only, when no email is sent: the link the email would have carried. */
  devLink?: string
}

export function str(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

/** A RoleError's own sentence, or a generic one for a bug. */
export function failure(error: unknown): ActionState {
  if (error instanceof RoleError) return { error: error.message }
  console.error(error)
  return { error: "Something went wrong on the server. Try again in a moment." }
}
