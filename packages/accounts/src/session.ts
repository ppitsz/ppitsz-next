import { cookies } from "next/headers"
import { cache } from "react"

import { adminAuth } from "./firebase"
import { identityToolkit, SIGN_IN_ERRORS } from "./identity"
import { ensureProfile, saveProfile } from "./profile"
import type { ProfileFields } from "./fields"
import { sessionCookieDomain } from "./urls"

/*
 * One PPITSZ account, one sign-in for every app (ADR 0008). The browser
 * never talks to Google: the password goes to our server, which checks it
 * with the Identity Toolkit and answers with a Firebase session cookie.
 *
 * The cookie is set on the apps' root domain (".ppitshenzhen.org" in
 * production, ./urls.ts), so the shop, Forms and the account app all read
 * it. Locally it has no domain: it stays on localhost, whose ports share
 * cookies.
 *
 * The cookie only proves who someone is. Every page and action looks up what
 * they may do in its own app's roles (ADR 0004, ./roles.ts).
 */

export const SESSION_COOKIE = "ppitsz_session"

/** The longest session Firebase allows. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60

export interface Session {
  uid: string
  email: string
  /** The account's display name, or its email when it has none. */
  name: string
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(sessionCookieDomain() ? { domain: sessionCookieDomain() } : {}),
  }
}

/**
 * The account behind a session cookie, or null when it is invalid, expired
 * or revoked (a password reset signs out every device).
 */
export async function verifySession(cookie: string): Promise<Session | null> {
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true)
    const email = decoded.email ?? ""
    return { uid: decoded.uid, email, name: (decoded.name as string | undefined) || email }
  } catch {
    return null
  }
}

/** The signed-in account, or null. Verified once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value
  return cookie ? verifySession(cookie) : null
})

/** Server actions and route handlers only: they are the ones that may set cookies. */
export async function startSession(cookie: string) {
  ;(await cookies()).set(SESSION_COOKIE, cookie, { ...cookieOptions(), maxAge: SESSION_MAX_AGE_SECONDS })
}

/** Signs this browser out of every app. Server actions and route handlers only. */
export async function endSession() {
  ;(await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 })
}

/* -------------------------------------------------------------------------
   Signing in and up
   ------------------------------------------------------------------------- */

export type AuthResult =
  | { ok: true; cookie: string; session: Session }
  | { ok: false; error: string; field?: "email" | "password" }

/** Checks the password and returns a session cookie. Any account may sign in; roles are checked per app. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const result = await identityToolkit<{ idToken: string }>("signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  })
  if (!result.ok) return { ok: false, error: SIGN_IN_ERRORS[result.code] ?? "Couldn't sign in. Try again in a moment." }

  const decoded = await adminAuth().verifyIdToken(result.data.idToken)
  const accountEmail = decoded.email ?? email
  const session = { uid: decoded.uid, email: accountEmail, name: (decoded.name as string | undefined) || accountEmail }
  // An account made by a staff script or a panitia invite has no profile yet.
  await ensureProfile(session, (decoded.name as string | undefined) ?? "")
  const cookie = await adminAuth().createSessionCookie(result.data.idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  })
  return { ok: true, cookie, session }
}

/** Creates the account and its profile, then signs in. The fields are already checked. */
export async function signUp(input: ProfileFields & { email: string; password: string }): Promise<AuthResult> {
  let uid: string
  try {
    uid = (await adminAuth().createUser({ email: input.email, password: input.password, displayName: input.name })).uid
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === "auth/email-already-exists") {
      return { ok: false, field: "email", error: "This email already has an account. Sign in instead." }
    }
    if (code === "auth/invalid-email") return { ok: false, field: "email", error: "This email isn't valid." }
    if (code === "auth/invalid-password") return { ok: false, field: "password", error: "Your password needs at least 8 characters." }
    throw error
  }
  await saveProfile({ uid, email: input.email }, input)
  return signIn(input.email, input.password)
}
