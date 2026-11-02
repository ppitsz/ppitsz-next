/*
 * What an account's fields must hold. No server imports, so client
 * components may use it too.
 */

export const MIN_PASSWORD_LENGTH = 8
/** Firebase's own limit is far higher; this keeps a pasted novel out. */
export const MAX_PASSWORD_LENGTH = 128

export interface ProfileFields {
  name: string
  /** Optional on the account; the shop asks for it at checkout. */
  wechatId: string
  /** Optional on the account; delivery asks for it at checkout. */
  phone: string
}

export type ProfileIssues = Partial<Record<keyof ProfileFields, string>>

/** The profile, trimmed, and what is wrong with it. Only the name is required. */
export function cleanProfile(input: ProfileFields): { profile: ProfileFields; issues: ProfileIssues } {
  const profile = { name: input.name.trim(), wechatId: input.wechatId.trim(), phone: input.phone.trim() }
  const issues: ProfileIssues = {}
  if (profile.name.length < 2) issues.name = "Write your name, at least 2 characters."
  else if (profile.name.length > 60) issues.name = "Your name can be at most 60 characters."
  if (profile.wechatId.length > 40) issues.wechatId = "Your WeChat ID can be at most 40 characters."
  if (profile.phone.length > 30) issues.phone = "Your phone number can be at most 30 characters."
  else if (!/^[0-9+()\s-]*$/.test(profile.phone)) issues.phone = "Your phone number can only have digits, spaces and +."
  return { profile, issues }
}

/** The problem with a new password, or null. */
export function passwordIssue(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.length > MAX_PASSWORD_LENGTH) return `Your password can be at most ${MAX_PASSWORD_LENGTH} characters.`
  return null
}

/** Loose on purpose: Firebase has the last word. */
export function isEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** 12 characters without look-alikes: easy to read out over WeChat. */
export function generatePassword() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => alphabet[b % alphabet.length]).join("")
}
