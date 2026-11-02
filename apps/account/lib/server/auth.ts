import { notFound, redirect } from "next/navigation"

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

/** A Portal admin, or not found: Accounts doesn't exist for anyone else. */
export async function requirePortalAdmin(next: string): Promise<Session> {
  const session = await requireSession(next)
  if (!(await isPortalAdmin(session.uid))) notFound()
  return session
}
