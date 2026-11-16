"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { endSession, getSession } from "@ppitsz/accounts/session"

import { newAccessCode } from "../domain/codes"
import { ERROR_MESSAGES, FormError, isFormError } from "../domain/errors"
import { checkAnswers, checkIdentity, effectiveSettings, isEmail, isFileAnswer, normalizeEmail } from "../domain/form"
import { canSelfCancel } from "../domain/tickets"
import { paths } from "../form-copy"
import { mailConfigured } from "../mail/resend"
import { sendAccessCode, sendResponseEmail } from "../server/notify"
import { clientIp, deviceId, deviceKeyOf } from "../server/request-meta"
import { siteOrigin } from "../server/site-url"
import {
  cancelResponse,
  createResponse,
  getForm,
  getResponseByToken,
  newResponseId,
  responsesByEmail,
  saveAccessCode,
  updateOwnResponse,
  useAccessCode,
} from "../store"
import { deleteMediaQuietly } from "../store/media"
import { allowRequest, LIMITS } from "../store/rate-limit"
import { readResponseInput, storeUploads } from "./response-input"
import { failure, messageOf, str, type ActionState } from "./state"

/*
 * Responder actions: no account needed, so the response's secret token is
 * the key to editing or canceling it. Someone signed in to their PPITSZ
 * account has the response linked to it, except on an anonymous form. Spam is held back by rate limits and a
 * honeypot field, not a captcha (see lib/store/rate-limit.ts).
 */

const SUBMIT_ERRORS = "Some answers aren't right yet. Check the ones marked in red."

export async function submitAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // A field people never see; bots fill every field.
  if (str(formData, "website")) return { error: "The form couldn't be sent. Reload the page." }

  const device = await deviceId()
  const allowed = await allowRequest([
    { key: `submit:device:${device}`, limit: LIMITS.submitPerDevice },
    { key: `submit:ip:${await clientIp()}`, limit: LIMITS.submitPerIp },
  ])
  if (!allowed) return { error: ERROR_MESSAGES.RATE_LIMITED }

  const form = await getForm(formId)
  if (!form) return { error: ERROR_MESSAGES.NOT_FOUND }

  const { identity: rawIdentity, input, files, ticketTypeId } = readResponseInput(form, formData)
  const { identity, errors: identityErrors } = checkIdentity(form, rawIdentity)
  const { answers, uploads, errors } = checkAnswers(form.sections, input)
  const fieldErrors = { ...identityErrors, ...errors }
  if (form.tickets.enabled && !ticketTypeId) fieldErrors.ticketTypeId = "Choose a ticket type."
  if (Object.keys(fieldErrors).length > 0) return { error: SUBMIT_ERRORS, fieldErrors }

  // An anonymous form never reads the session, so nothing ties it to an account.
  const accountUid = effectiveSettings(form.settings, form.tickets).collectEmail ? ((await getSession())?.uid ?? null) : null

  const id = newResponseId()
  let stored: string[] = []
  let response
  try {
    stored = await storeUploads(form.id, id, uploads, files, answers)
    response = await createResponse(
      id,
      { formId: form.id, identity, answers, ticketTypeId, source: "online", deviceKey: deviceKeyOf(device), accountUid },
      new Date()
    )
  } catch (error) {
    await Promise.all(stored.map(deleteMediaQuietly))
    if (isFormError(error) && error.code === "ALREADY_RESPONDED") return resendExisting(form.id, identity.email)
    return failure(error)
  }

  const origin = await siteOrigin()
  try {
    await sendResponseEmail(form, response, origin)
  } catch (error) {
    // The response stands; organizers can resend its email from the dashboard.
    messageOf(error)
  }
  redirect(`${paths.response(response.token, form.tickets.enabled)}?new=1`)
}

/** Someone registering again with the same email gets their existing response re-sent. */
async function resendExisting(formId: string, email: string): Promise<ActionState> {
  const fieldErrors = { email: ERROR_MESSAGES.ALREADY_RESPONDED }
  const allowed = await allowRequest([{ key: `resend:${formId}:${email}`, limit: LIMITS.resendPerEmail }])
  const form = await getForm(formId)
  const [existing] = await responsesByEmail(formId, email)
  if (!allowed || !form || !existing) return { error: ERROR_MESSAGES.ALREADY_RESPONDED, fieldErrors }
  await sendResponseEmail(form, existing, await siteOrigin())
  return {
    error: `${ERROR_MESSAGES.ALREADY_RESPONDED} We've sent the ${form.tickets.enabled ? "ticket" : "link to the answers"} to that email again. Check your spam folder too.`,
    fieldErrors,
  }
}

export async function editAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const response = await getResponseByToken(token)
  if (!response) return { error: ERROR_MESSAGES.RESPONSE_NOT_FOUND }
  const form = await getForm(response.formId)
  if (!form) return { error: ERROR_MESSAGES.NOT_FOUND }

  const { identity: rawIdentity, input, files } = readResponseInput(form, formData)
  // The email can't change here: it is the response's key.
  const { identity, errors: identityErrors } = checkIdentity(form, { ...rawIdentity, email: response.identity.email })
  const { answers, uploads, errors } = checkAnswers(form.sections, input, response.answers)
  const fieldErrors = { ...identityErrors, ...errors }
  delete fieldErrors.email
  if (Object.keys(fieldErrors).length > 0) return { error: SUBMIT_ERRORS, fieldErrors }

  let stored: string[] = []
  try {
    stored = await storeUploads(form.id, response.id, uploads, files, answers)
    await updateOwnResponse(
      response.id,
      { identity: { name: identity.name, wechatId: identity.wechatId, campus: identity.campus }, answers },
      new Date()
    )
  } catch (error) {
    await Promise.all(stored.map(deleteMediaQuietly))
    return failure(error)
  }
  // Files replaced or no longer shown.
  const kept = new Set(Object.values(answers).filter(isFileAnswer).map((a) => a.path))
  await Promise.all(
    Object.values(response.answers)
      .filter(isFileAnswer)
      .filter((a) => !kept.has(a.path))
      .map((a) => deleteMediaQuietly(a.path))
  )
  redirect(`${paths.response(token, form.tickets.enabled)}?edited=1`)
}

export async function cancelOwnAction(token: string): Promise<ActionState> {
  try {
    const response = await getResponseByToken(token)
    if (!response) throw new FormError("RESPONSE_NOT_FOUND")
    const form = await getForm(response.formId)
    if (!form) throw new FormError("NOT_FOUND")
    if (!canSelfCancel(form, response, new Date())) throw new FormError("CANNOT_CANCEL")
    await cancelResponse(response.id, "self", new Date())
    revalidatePath(paths.response(token, form.tickets.enabled))
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}

/** Re-sends the ticket or receipt to the response's own email. */
export async function resendOwnAction(token: string): Promise<ActionState> {
  const response = await getResponseByToken(token)
  if (!response?.identity.email) return { error: ERROR_MESSAGES.NO_EMAIL }
  const allowed = await allowRequest([{ key: `resend:${response.formId}:${response.identity.email}`, limit: LIMITS.resendPerEmail }])
  if (!allowed) return { error: ERROR_MESSAGES.RATE_LIMITED }
  const form = await getForm(response.formId)
  if (!form) return { error: ERROR_MESSAGES.NOT_FOUND }
  try {
    await sendResponseEmail(form, response, await siteOrigin())
    return { done: Date.now(), message: `Sent again to ${response.identity.email}.` }
  } catch (error) {
    return failure(error)
  }
}

/* -------------------------------------------------------------------------
   Getting back: email → 6-digit code → the response
   ------------------------------------------------------------------------- */

export async function requestAccessAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(formData, "email"))
  if (!isEmail(email)) return { fieldErrors: { email: "This email isn't valid." } }
  const allowed = await allowRequest([
    { key: `access:${formId}:${email}`, limit: LIMITS.accessPerEmail },
    { key: `access:ip:${await clientIp()}`, limit: LIMITS.accessPerIp },
  ])
  if (!allowed) return { error: ERROR_MESSAGES.RATE_LIMITED }

  const form = await getForm(formId)
  if (!form) return { error: ERROR_MESSAGES.NOT_FOUND }
  const [response] = await responsesByEmail(formId, email)
  let devLink: string | undefined
  if (response) {
    const code = newAccessCode()
    const now = new Date()
    await saveAccessCode(formId, email, code, now)
    await sendAccessCode(form, response, email, code, await siteOrigin())
    if (!mailConfigured() && process.env.NODE_ENV !== "production") devLink = `code ${code}`
  }
  // The same answer either way, so this can't be used to find out who responded.
  return { done: Date.now(), message: email, devLink }
}

export async function verifyAccessAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(formData, "email"))
  const code = str(formData, "code").replace(/\s/g, "")
  if (!/^\d{6}$/.test(code)) return { message: email, done: 1, fieldErrors: { code: "The code has 6 digits." } }
  const ok = await useAccessCode(formId, email, code, new Date())
  const [response] = ok ? await responsesByEmail(formId, email) : []
  if (!response) return { message: email, done: 1, fieldErrors: { code: ERROR_MESSAGES.WRONG_CODE } }
  const form = await getForm(formId)
  redirect(paths.response(response.token, !!form?.tickets.enabled))
}

/** Signs out of every app (ADR 0008), back to the open forms. */
export async function responderSignOutAction() {
  await endSession()
  redirect("/")
}
