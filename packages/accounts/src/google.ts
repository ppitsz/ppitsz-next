import { createHash, randomBytes } from "node:crypto"

import { SIGN_IN_ERRORS } from "./identity"

/*
 * Signing in with Google (ADR 0011), the parts without Firebase calls: Google's
 * URL, checking what Google sends back, and deciding what a Google sign-in
 * does to our accounts. The Firebase side is ./google-sign-in.ts.
 *
 * The browser only visits Google to pick an account (which needs a VPN in
 * mainland China); the code it brings back is exchanged by our server, so
 * the session is our own Firebase session cookie, as with a password.
 */

export const GOOGLE_PROVIDER = "google.com"

/** The OAuth client, or null when Google sign-in isn't set up. */
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export const googleConfigured = () => googleConfig() !== null

/** What a Google sign-in remembers between leaving for Google and coming back, in a short-lived cookie. */
export interface GoogleFlow {
  /** Must come back from Google unchanged: the answer belongs to this browser's request. */
  state: string
  /** PKCE: only the server that started the flow can exchange its code. */
  verifier: string
  /** Must be in the ID token: the token was made for this request. */
  nonce: string
  /** Signing in (and up), or linking Google to the signed-in account. */
  intent: "signIn" | "link"
  /** Where to go afterwards, already checked by safeNext. */
  next: string
}

const random = () => randomBytes(32).toString("base64url")

export function newGoogleFlow(intent: GoogleFlow["intent"], next: string): GoogleFlow {
  return { state: random(), verifier: random(), nonce: random(), intent, next }
}

/** The flow from its cookie, or null when it is missing or not ours. */
export function parseGoogleFlow(raw: string | undefined): GoogleFlow | null {
  if (!raw) return null
  try {
    const flow = JSON.parse(raw) as Partial<GoogleFlow>
    const strings = [flow.state, flow.verifier, flow.nonce, flow.next].every((v) => typeof v === "string" && v !== "")
    if (!strings || (flow.intent !== "signIn" && flow.intent !== "link")) return null
    return flow as GoogleFlow
  } catch {
    return null
  }
}

/** RFC 7636's S256 code challenge. */
export function codeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url")
}

/** Google's page for picking an account. */
export function googleAuthUrl(clientId: string, redirectUri: string, flow: GoogleFlow) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: codeChallenge(flow.verifier),
    code_challenge_method: "S256",
    // Always ask which account: a shared laptop is often signed in to someone else's.
    prompt: "select_account",
  }).toString()
  return url.toString()
}

/** The Google account, as its ID token describes it. */
export interface GoogleIdentity {
  /** Google's id for the account: never changes, unlike the email. */
  sub: string
  email: string
  name: string
  /** A googleusercontent.com photo URL, or "". Copied by our server, never shown from Google (ADR 0009). */
  picture: string
}

export type GoogleErrorCode =
  | "off"
  | "busy"
  | "expired"
  | "failed"
  | "unverified"
  | "disabled"
  | "linked-elsewhere"
  | "has-google"
  | "email-has-google"

export type GoogleResult<T> = { ok: true; value: T } | { ok: false; code: GoogleErrorCode }

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

/**
 * The identity in an ID token straight from Google's token endpoint. Its
 * signature isn't checked: it came from Google over TLS, in answer to our
 * client secret (OpenID Connect Core 3.1.3.7). The claims still are.
 */
export function identityFromIdToken(
  idToken: string,
  expected: { clientId: string; nonce: string; now?: number }
): GoogleResult<GoogleIdentity> {
  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"))
  } catch {
    return { ok: false, code: "failed" }
  }
  const now = expected.now ?? Date.now()
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const valid =
    ISSUERS.includes(String(claims.iss)) &&
    audience.includes(expected.clientId) &&
    typeof claims.exp === "number" &&
    claims.exp * 1000 > now &&
    claims.nonce === expected.nonce &&
    typeof claims.sub === "string" &&
    claims.sub !== "" &&
    typeof claims.email === "string" &&
    claims.email !== ""
  if (!valid) return { ok: false, code: "failed" }
  // Only a verified email may find or make an account: it's the proof a reset link gives.
  if (claims.email_verified !== true && claims.email_verified !== "true") return { ok: false, code: "unverified" }
  return {
    ok: true,
    value: {
      sub: claims.sub as string,
      email: (claims.email as string).toLowerCase(),
      name: typeof claims.name === "string" ? claims.name.trim() : "",
      picture: typeof claims.picture === "string" ? claims.picture : "",
    },
  }
}

/** An account as the plan needs it. */
export interface PlanAccount {
  uid: string
  /** Its linked Google account's id, or null. */
  googleSub: string | null
}

export type GooglePlan =
  | { kind: "signIn"; uid: string }
  | { kind: "link"; uid: string; sameEmail: boolean }
  | { kind: "create" }
  | { kind: "refuse"; code: GoogleErrorCode }

/**
 * What a verified Google account does:
 * - linking (signed in): link it to this account, unless another account has it;
 * - already linked: sign in to that account;
 * - an account has its email: link it there and sign in (Google proved the inbox);
 * - otherwise: a new account, without a password.
 */
export function planGoogle(input: {
  sub: string
  /** The account this Google account is linked to. */
  linked: PlanAccount | null
  /** The account whose email is the Google account's. */
  emailOwner: PlanAccount | null
  /** Linking from the profile page: the signed-in account. */
  signedIn: PlanAccount | null
}): GooglePlan {
  const { sub, linked, emailOwner, signedIn } = input
  if (signedIn) {
    if (linked && linked.uid !== signedIn.uid) return { kind: "refuse", code: "linked-elsewhere" }
    if (linked) return { kind: "signIn", uid: signedIn.uid }
    if (signedIn.googleSub && signedIn.googleSub !== sub) return { kind: "refuse", code: "has-google" }
    return { kind: "link", uid: signedIn.uid, sameEmail: emailOwner?.uid === signedIn.uid }
  }
  if (linked) return { kind: "signIn", uid: linked.uid }
  if (emailOwner) {
    if (emailOwner.googleSub) return { kind: "refuse", code: "email-has-google" }
    return { kind: "link", uid: emailOwner.uid, sameEmail: true }
  }
  return { kind: "create" }
}

export const GOOGLE_ERRORS: Record<GoogleErrorCode, string> = {
  off: "Signing in with Google isn't set up yet. Use your email and password.",
  busy: "Too many tries. Wait a few minutes, then try again.",
  expired: "That took too long, or started in another browser. Try again.",
  failed: "Google didn't let you in this time. Try again in a moment.",
  unverified: "Google hasn't verified this Google account's email, so it can't be used here.",
  disabled: SIGN_IN_ERRORS.USER_DISABLED!,
  "linked-elsewhere":
    "This Google account is already linked to another PPITSZ account. Sign out, then continue with Google to use that one.",
  "has-google": "Your account is already linked to another Google account. Unlink it first.",
  "email-has-google": "The account with this email is linked to a different Google account. Continue with that one, or use your password.",
}

/** The sentence for a `?google=` code, or null when it isn't one. */
export function googleError(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(GOOGLE_ERRORS, code) ? GOOGLE_ERRORS[code as GoogleErrorCode] : null
}

/** Google's photo URL at 512px, the size we store, instead of the token's 96px. */
export function largeGooglePhoto(picture: string) {
  return picture.replace(/=s\d+(-c)?$/, "=s512-c")
}
