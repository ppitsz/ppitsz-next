import { accountOrigin } from "@ppitsz/accounts/urls"
import type { GoogleErrorCode, GoogleFlow } from "@ppitsz/accounts/google"

/*
 * The two Google routes' shared parts: /auth/google sends the browser to
 * Google, /auth/google/callback is where Google sends it back (ADR 0011).
 */

/** The flow between the two routes. Host-only and short-lived; only those routes read it. */
export const GOOGLE_FLOW_COOKIE = "ppitsz_google"

export function flowCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: Google's redirect back is a top-level GET, which still carries it.
    sameSite: "lax" as const,
    path: "/auth/google",
    maxAge,
  }
}

/** Registered as an authorized redirect URI on the OAuth client, for production and localhost:3003. */
export const googleCallbackUrl = () => `${accountOrigin()}/auth/google/callback`

/**
 * Where a Google sign-in ends without signing in: the sign-in page (keeping
 * `next`) or the profile page, with `?google=` saying why.
 */
export function googleBackTo(intent: GoogleFlow["intent"], next: string, code?: GoogleErrorCode | "linked") {
  const params = new URLSearchParams()
  if (code) params.set("google", code)
  if (intent === "signIn" && next !== "/") params.set("next", next)
  const query = params.toString()
  return `${intent === "link" ? "/" : "/sign-in"}${query ? `?${query}` : ""}`
}
