import { notFound, redirect } from "next/navigation"

import { isProfileComplete } from "@ppitsz/accounts/fields"
import { getProfile } from "@ppitsz/accounts/profile"
import { isPortalAdmin } from "@ppitsz/accounts/roles"
import { getSession, type Session } from "@ppitsz/accounts/session"

/*
 * Every page and server action checks the session itself: layouts don't
 * re-run on navigation, so a check there alone would not protect anything.
 */

/** The signed-in account, or a redirect to sign in that comes back to `next` (a path here). */
export async function requireSession(next = "/"): Promise<Session> {
  const session = await getSession()
  if (!session) redirect(next === "/" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`)
  return session
}

/**
 * Where to go once signed in: `next` (already checked by safeNext), or first
 * /finish-profile when the account lacks what sign-up asks for, as a new
 * Google sign-in or a staff account made by a script does.
 */
export async function afterSignIn(uid: string, next: string): Promise<string> {
  const profile = await getProfile(uid)
  if (profile && isProfileComplete(profile)) return next
  return next === "/" ? "/finish-profile" : `/finish-profile?next=${encodeURIComponent(next)}`
}

/** A Portal admin, or not found: Accounts doesn't exist for anyone else. */
export async function requirePortalAdmin(next: string): Promise<Session> {
  const session = await requireSession(next)
  if (!(await isPortalAdmin(session.uid))) notFound()
  return session
}
