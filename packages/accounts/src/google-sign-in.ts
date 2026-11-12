import type { UserRecord } from "firebase-admin/auth"

import { AVATAR_MAX_BYTES, AVATAR_TYPES, removeProviderAvatar, saveProviderAvatar } from "./avatar"
import { adminAuth } from "./firebase"
import {
  GOOGLE_PROVIDER,
  googleConfig,
  identityFromIdToken,
  largeGooglePhoto,
  planGoogle,
  type GoogleFlow,
  type GoogleIdentity,
  type GoogleResult,
  type PlanAccount,
} from "./google"
import { ensureProfile, getProfile } from "./profile"

/*
 * Google sign-in against our Firebase accounts (ADR 0011): exchanging
 * Google's code, linking, unlinking, and our copy of the Google photo.
 * What a sign-in does is decided in ./google.ts (planGoogle).
 *
 * Links are made with the Admin SDK, not Firebase's own Google sign-in, so
 * Firebase's "one account per email" rules never remove a password: a
 * linked account keeps every way in it had.
 */

/** Trades the code Google sent back for the Google account behind it. */
export async function exchangeGoogleCode(
  code: string,
  flow: GoogleFlow,
  redirectUri: string
): Promise<GoogleResult<GoogleIdentity>> {
  const config = googleConfig()
  if (!config) return { ok: false, code: "off" }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string }
  if (!res.ok || !data.id_token) {
    console.error("google token exchange", res.status, data.error ?? "")
    return { ok: false, code: "failed" }
  }
  return identityFromIdToken(data.id_token, { clientId: config.clientId, nonce: flow.nonce })
}

const googleSubOf = (user: UserRecord) => user.providerData.find((p) => p.providerId === GOOGLE_PROVIDER)?.uid ?? null
const hasPasswordOn = (user: UserRecord) => user.providerData.some((p) => p.providerId === "password")
const asPlan = (user: UserRecord | null): PlanAccount | null => (user ? { uid: user.uid, googleSub: googleSubOf(user) } : null)

async function orNull(lookup: Promise<UserRecord>) {
  try {
    return await lookup
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return null
    throw error
  }
}

/**
 * Signs in, links or creates the account for a verified Google account, and
 * returns its uid; the caller starts the session. `signedInUid` is set when
 * linking from the profile page.
 */
export async function completeGoogle(identity: GoogleIdentity, signedInUid: string | null): Promise<GoogleResult<string>> {
  const [linked, emailOwner, signedIn] = await Promise.all([
    orNull(adminAuth().getUserByProviderUid(GOOGLE_PROVIDER, identity.sub)),
    orNull(adminAuth().getUserByEmail(identity.email)),
    signedInUid ? orNull(adminAuth().getUser(signedInUid)) : Promise.resolve(null),
  ])
  if (signedInUid && !signedIn) return { ok: false, code: "failed" }

  const plan = planGoogle({ sub: identity.sub, linked: asPlan(linked), emailOwner: asPlan(emailOwner), signedIn: asPlan(signedIn) })
  if (plan.kind === "refuse") return { ok: false, code: plan.code }

  let user: UserRecord
  if (plan.kind === "create") {
    user = await adminAuth().createUser({ email: identity.email, emailVerified: true, displayName: identity.name || undefined })
    await linkGoogle(user.uid, identity, false)
  } else {
    user = [linked, emailOwner, signedIn].find((u) => u?.uid === plan.uid)!
    if (user.disabled) return { ok: false, code: "disabled" }
    // Google proved the inbox: the account's email counts as verified from now on.
    if (plan.kind === "link") await linkGoogle(user.uid, identity, plan.sameEmail && !user.emailVerified)
  }

  await ensureProfile({ uid: user.uid, email: user.email ?? identity.email }, user.displayName || identity.name)
  const profile = await getProfile(user.uid)
  // On a new link always; on a sign-in only while we have no copy (ADR 0009).
  if (plan.kind !== "signIn" || !profile?.providerAvatarPath) await copyGooglePhoto(user.uid, identity.picture)
  return { ok: true, value: user.uid }
}

async function linkGoogle(uid: string, identity: GoogleIdentity, markVerified: boolean) {
  await adminAuth().updateUser(uid, {
    providerToLink: {
      providerId: GOOGLE_PROVIDER,
      uid: identity.sub,
      email: identity.email,
      displayName: identity.name || undefined,
    },
    ...(markVerified ? { emailVerified: true } : {}),
  })
}

/** Our copy of the Google photo. A photo that can't be fetched is skipped: it never blocks signing in. */
async function copyGooglePhoto(uid: string, picture: string) {
  if (!picture.startsWith("https://")) return
  try {
    const res = await fetch(largeGooglePhoto(picture), { signal: AbortSignal.timeout(10_000) })
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? ""
    if (!res.ok || !AVATAR_TYPES[contentType]) return
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > AVATAR_MAX_BYTES) return
    await saveProviderAvatar(uid, { bytes, contentType })
  } catch (error) {
    console.error("google photo", error)
  }
}

/** How an account can sign in, for its profile page. */
export interface SignInMethods {
  password: boolean
  /** The linked Google account, or null. */
  google: { email: string } | null
}

export async function signInMethods(uid: string): Promise<SignInMethods> {
  const user = await adminAuth().getUser(uid)
  const google = user.providerData.find((p) => p.providerId === GOOGLE_PROVIDER)
  return { password: hasPasswordOn(user), google: google ? { email: google.email ?? "" } : null }
}

/**
 * Unlinks Google and forgets its photo. Refused ("no-password") for an
 * account that has no password, which would then have no way in.
 */
export async function unlinkGoogle(uid: string): Promise<"ok" | "no-password"> {
  const user = await adminAuth().getUser(uid)
  if (!googleSubOf(user)) return "ok"
  if (!hasPasswordOn(user)) return "no-password"
  await adminAuth().updateUser(uid, { providersToUnlink: [GOOGLE_PROVIDER] })
  await removeProviderAvatar(uid)
  return "ok"
}
