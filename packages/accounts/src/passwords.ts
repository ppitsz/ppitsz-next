import { adminAuth } from "./firebase"
import { identityToolkit, SIGN_IN_ERRORS } from "./identity"
import { ensureProfile } from "./profile"

/*
 * Setting a password, by the account itself (a reset link) or for it (a
 * Portal admin, a panitia invite). Firebase's own reset email links to its
 * hosted page, which needs Google, so our links carry the reset code to the
 * account app's /reset-password instead, and we send the email ourselves.
 * Without Resend, Firebase sends it, with its action URL set to that page.
 */

/** The account for `email`, or null. */
export async function findAccount(email: string) {
  try {
    const user = await adminAuth().getUserByEmail(email)
    return {
      uid: user.uid,
      email: user.email ?? email,
      name: user.displayName ?? "",
      hasPassword: user.providerData.some((p) => p.providerId === "password"),
    }
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return null
    throw error
  }
}

/**
 * The account for `email`, made when there is none: with `password`, or
 * without one (a panitia invite, whose link sets it). An existing account
 * keeps its password, so giving someone a role never locks them out.
 */
export async function ensureAccount(email: string, name: string, password?: string) {
  const existing = await findAccount(email)
  if (existing) return { ...existing, name: existing.name || name, created: false }
  const user = await adminAuth().createUser({ email, displayName: name, ...(password ? { password } : {}) })
  await ensureProfile({ uid: user.uid, email }, name)
  return { uid: user.uid, email, name, hasPassword: !!password, created: true }
}

/**
 * A link to the account app's /reset-password with a Firebase reset code,
 * for an account that exists. Works for an account without a password too
 * (a panitia invite), which then sets its first one.
 */
export async function resetLink(email: string, accountOrigin: string) {
  const link = await adminAuth().generatePasswordResetLink(email)
  const code = new URL(link).searchParams.get("oobCode")
  if (!code) throw new Error("Firebase returned a reset link without a code")
  return `${accountOrigin}/reset-password?code=${encodeURIComponent(code)}`
}

/**
 * Has Firebase send its own reset email, for when we can't send one
 * (no Resend). Its link only reaches our /reset-password, and not Google's
 * page, once the template's action URL is set to it: Firebase console ›
 * Authentication › Templates › Password reset › Customize action URL.
 */
export async function sendFirebaseResetEmail(email: string) {
  const result = await identityToolkit("sendOobCode", { requestType: "PASSWORD_RESET", email })
  if (!result.ok) throw new Error(`Firebase refused the reset email: ${result.code}`)
}

const RESET_ERRORS: Record<string, string> = {
  EXPIRED_OOB_CODE: "This link has expired. Ask for a new one.",
  INVALID_OOB_CODE: "This link isn't valid or has been used. Ask for a new one.",
  USER_DISABLED: SIGN_IN_ERRORS.USER_DISABLED!,
  WEAK_PASSWORD: "Your password needs at least 8 characters.",
}

/** The email a reset code belongs to, or null when it is used up or expired. */
export async function checkResetCode(code: string): Promise<string | null> {
  const result = await identityToolkit<{ email: string }>("resetPassword", { oobCode: code })
  return result.ok ? result.data.email : null
}

/** Sets the new password from a reset code and signs the account out everywhere. */
export async function resetPassword(
  code: string,
  newPassword: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const result = await identityToolkit<{ email: string }>("resetPassword", { oobCode: code, newPassword })
  if (!result.ok) return { ok: false, error: RESET_ERRORS[result.code] ?? "Your password couldn't be changed. Try again." }
  const user = await adminAuth().getUserByEmail(result.data.email)
  await adminAuth().revokeRefreshTokens(user.uid)
  return { ok: true, email: result.data.email }
}

/** Sets `password` for the account and signs it out everywhere: a Portal admin's reset, or a script's. */
export async function setPassword(uid: string, password: string) {
  await adminAuth().updateUser(uid, { password })
  await adminAuth().revokeRefreshTokens(uid)
}
