import { authEmulatorHost } from "./firebase"

/*
 * Firebase Auth's REST API (Identity Toolkit), called from our server: the
 * Admin SDK can't check a password, and browsers in China can't reach
 * Google. Needs FIREBASE_API_KEY, except on the emulator.
 */

export type IdentityResult<T> = { ok: true; data: T } | { ok: false; code: string }

export async function identityToolkit<T>(method: string, body: Record<string, unknown>): Promise<IdentityResult<T>> {
  const emulator = authEmulatorHost()
  const apiKey = process.env.FIREBASE_API_KEY ?? (emulator ? "emulator" : undefined)
  if (!apiKey) throw new Error("Missing environment variable FIREBASE_API_KEY")
  const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com"

  const res = await fetch(`${base}/v1/accounts:${method}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok || data.error) {
    // "TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account…" → the code before the first space.
    return { ok: false, code: data.error?.message?.split(" ")[0] ?? "" }
  }
  return { ok: true, data }
}

const WRONG = "Wrong email or password."
export const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: WRONG,
  EMAIL_NOT_FOUND: WRONG,
  INVALID_PASSWORD: WRONG,
  INVALID_EMAIL: WRONG,
  USER_DISABLED: "This account is disabled. Contact PPITSZ on its socials.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Try again in a few minutes.",
}
