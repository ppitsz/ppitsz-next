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

/**
 * What we know of someone as a member, shared with the old website, which
 * asked for both at its own sign-up. Kept in its format: the birthday as
 * "YYYY-MM-DD", the intake year as a number.
 */
export interface MemberFields {
  /** "YYYY-MM-DD"; "" until given. */
  birthday: string
  /** Their intake year, as the old website asks it; null until given. */
  cohortYear: number | null
}

export type MemberIssues = Partial<Record<keyof MemberFields, string>>

/** The first intake year on offer, as on the old website. */
export const MIN_COHORT_YEAR = 2000

/** The intake years to choose from, newest first: next year back to 2000. */
export function cohortYears(now = new Date()) {
  const years: number[] = []
  for (let year = now.getFullYear() + 1; year >= MIN_COHORT_YEAR; year--) years.push(year)
  return years
}

/** Both member fields, from a form, and what is wrong with them. Both are required. */
export function cleanMember(
  input: { birthday: string; cohortYear: string },
  now = new Date()
): { member: MemberFields; issues: MemberIssues } {
  const birthday = input.birthday.trim()
  const cohortYear = /^\d{4}$/.test(input.cohortYear.trim()) ? Number(input.cohortYear.trim()) : null
  const issues: MemberIssues = {}

  const date = /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? new Date(`${birthday}T00:00:00Z`) : null
  if (!birthday) issues.birthday = "Write your birthday."
  else if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) {
    issues.birthday = "Write your birthday as a date, like 2004-08-17."
  } else {
    const age = now.getUTCFullYear() - date.getUTCFullYear()
    if (age < 10 || age > 100) issues.birthday = "Check your birthday: it should make you between 10 and 100 years old."
  }

  if (cohortYear === null) issues.cohortYear = "Choose your intake year."
  else if (!cohortYears(now).includes(cohortYear)) issues.cohortYear = "Choose an intake year from the list."

  return { member: { birthday, cohortYear }, issues }
}

/** Whether we know everything sign-up asks for. The account app asks for the rest after signing in. */
export function isProfileComplete(profile: Pick<ProfileFields, "name"> & MemberFields) {
  return profile.name.trim().length >= 2 && !!profile.birthday && profile.cohortYear !== null
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
