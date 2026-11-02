"use server"

import { redirect } from "next/navigation"

import { cleanProfile, isEmail, normalizeEmail, passwordIssue } from "@ppitsz/accounts/fields"
import { findAccount, resetLink, resetPassword, sendFirebaseResetEmail } from "@ppitsz/accounts/passwords"
import { saveProfile } from "@ppitsz/accounts/profile"
import { endSession, signIn, signUp, startSession } from "@ppitsz/accounts/session"
import { accountOrigin, safeNext } from "@ppitsz/accounts/urls"

import { requireSession } from "../server/auth"
import { mailConfigured, sendResetEmail } from "../server/mail"
import { allowRequest, LIMITS, RATE_LIMITED } from "../server/rate-limit"
import { clientIp } from "../server/request-meta"
import { failure, str, type ActionState } from "./state"

/*
 * Signing in, up and out, resetting a password, editing the profile. The one
 * place in every app where this happens (ADR 0008).
 */

const UNREACHABLE = "The server can't reach the sign-in service. Try again in a moment."

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email")
  const password = String(formData.get("password") ?? "")
  const fieldErrors: ActionState["fieldErrors"] = {}
  if (!email) fieldErrors.email = "Write your account's email."
  if (!password) fieldErrors.password = "Write your password."
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors }

  const allowed = await allowRequest([
    { key: `signin:ip:${await clientIp()}`, limit: LIMITS.signInPerIp },
    { key: `signin:email:${email.toLowerCase()}`, limit: LIMITS.signInPerEmail },
  ])
  if (!allowed) return { error: RATE_LIMITED }

  let result
  try {
    result = await signIn(email, password)
  } catch (error) {
    console.error("sign in", error)
    return { error: UNREACHABLE }
  }
  if (!result.ok) return { error: result.error }

  await startSession(result.cookie)
  redirect(safeNext(formData.get("next")))
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(formData, "email"))
  const password = String(formData.get("password") ?? "")
  const { profile, issues } = cleanProfile({ name: str(formData, "name"), wechatId: "", phone: "" })
  const fieldErrors: ActionState["fieldErrors"] = { ...issues }
  if (!isEmail(email)) fieldErrors.email = "Write a valid email, like name@qq.com."
  const weak = passwordIssue(password)
  if (weak) fieldErrors.password = weak
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  if (!(await allowRequest([{ key: `signup:ip:${await clientIp()}`, limit: LIMITS.signUpPerIp }]))) {
    return { error: RATE_LIMITED }
  }

  let result
  try {
    result = await signUp({ ...profile, email, password })
  } catch (error) {
    console.error("sign up", error)
    return { error: UNREACHABLE }
  }
  if (!result.ok) return result.field ? { fieldErrors: { [result.field]: result.error } } : { error: result.error }

  await startSession(result.cookie)
  redirect(safeNext(formData.get("next")))
}

/** Signs this browser out of every app. */
export async function signOutAction() {
  await endSession()
  redirect("/sign-in")
}

/** Emails a link to set a new password. Says the same whether or not the account exists. */
export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(formData, "email"))
  if (!isEmail(email)) return { fieldErrors: { email: "Write your account's email." } }

  const allowed = await allowRequest([
    { key: `reset:ip:${await clientIp()}`, limit: LIMITS.resetPerIp },
    { key: `reset:email:${email}`, limit: LIMITS.resetPerEmail },
  ])
  if (!allowed) return { error: RATE_LIMITED }

  let devLink: string | undefined
  try {
    if (await findAccount(email)) {
      if (mailConfigured() || process.env.NODE_ENV !== "production") {
        const url = await resetLink(email, accountOrigin())
        await sendResetEmail(email, url)
        if (!mailConfigured()) devLink = url
      } else {
        // No Resend: Firebase sends the email, linking to /reset-password (see sendFirebaseResetEmail).
        await sendFirebaseResetEmail(email)
      }
    }
  } catch (error) {
    console.error("forgot password", error)
    return { error: "The link couldn't be sent. Try again in a moment." }
  }
  return { done: Date.now(), message: email, devLink }
}

/** From the emailed link: sets the new password, then sends them to sign in with it. */
export async function resetPasswordAction(code: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "")
  const weak = passwordIssue(password)
  if (weak) return { fieldErrors: { password: weak } }

  let result
  try {
    result = await resetPassword(String(code), password)
  } catch (error) {
    console.error("reset password", error)
    return { error: UNREACHABLE }
  }
  if (!result.ok) return { error: result.error }

  // A reset signs out every device, this one included.
  await endSession()
  redirect(`/sign-in?reset=1&email=${encodeURIComponent(result.email)}`)
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession()
  const { profile, issues } = cleanProfile({
    name: str(formData, "name"),
    wechatId: str(formData, "wechatId"),
    phone: str(formData, "phone"),
  })
  if (Object.keys(issues).length > 0) return { fieldErrors: issues }
  try {
    await saveProfile(session, profile)
  } catch (error) {
    return failure(error)
  }
  return { done: Date.now() }
}
