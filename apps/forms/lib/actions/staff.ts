"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { endSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"
import { CAMPUS_IDS } from "@ppitsz/ui/lib/network"

import { parseScan } from "../domain/codes"
import { ERROR_MESSAGES, FormError } from "../domain/errors"
import { checkIdentity, effectiveSettings, isEmail, normalizeEmail } from "../domain/form"
import { SCAN_REFUSALS, type ScanResult } from "../domain/tickets"
import type { Form, FormResponse, Identity } from "../domain/types"
import { mailConfigured } from "../mail/resend"
import { reportError } from "../server/alerts"
import { requireFormAccess } from "../server/auth"
import { sendResponseEmail } from "../server/notify"
import { clientIp } from "../server/request-meta"
import { siteOrigin } from "../server/site-url"
import {
  cancelResponse,
  checkIn,
  createResponse,
  findResponseByCode,
  getResponse,
  getResponseByToken,
  newResponseId,
  undoCheckIn,
  updateResponseByStaff,
} from "../store"
import { allowRequest, LIMITS } from "../store/rate-limit"
import { failure, str, type ActionState } from "./state"

/*
 * Organizer actions. Each one checks the session and the form itself, since a
 * server action is a public endpoint whatever page renders it.
 */

/* -------------------------------------------------------------------------
   Session
   ------------------------------------------------------------------------- */

/** Signs out of every app (ADR 0008), back to signing in to the Forms dashboard. */
export async function signOutAction() {
  await endSession()
  redirect(signInUrl(`${await siteOrigin()}/staff`))
}

/* -------------------------------------------------------------------------
   The door
   ------------------------------------------------------------------------- */

/** What the scanner shows after a read: everything it needs, as plain data. */
export type ScanOutcome =
  | { ok: false; message: string }
  | {
      ok: true
      result: ScanResult
      message: string | null
      responseId: string
      name: string
      code: string
      typeName: string
      dayId: string
      source: FormResponse["source"]
    }

function outcomeOf(form: Form, response: FormResponse, result: ScanResult, dayId: string): ScanOutcome {
  return {
    ok: true,
    result,
    message: result.kind === "refused" ? SCAN_REFUSALS[result.reason] : null,
    responseId: response.id,
    name: response.identity.name || "(no name)",
    code: response.code,
    typeName: form.tickets.types.find((t) => t.id === response.ticketTypeId)?.name ?? "",
    dayId,
    source: response.source,
  }
}

/** Reads a QR or typed code and records a check-in for `dayId`. */
export async function scanAction(formId: string, dayId: string, text: string): Promise<ScanOutcome> {
  const { staff, form } = await requireFormAccess(formId)
  const parsed = parseScan(text)
  if (!parsed) return { ok: false, message: "This isn't a ticket QR code or ticket code." }
  try {
    const found =
      "token" in parsed ? await getResponseByToken(parsed.token) : await findResponseByCode(formId, parsed.code)
    if (!found) return { ok: false, message: "Ticket not found. Check the code." }
    if (found.formId !== formId) return { ok: false, message: "This ticket is for another form, not this event." }
    const { result, response } = await checkIn(formId, found.id, dayId, staff, new Date())
    return outcomeOf(form, response, result, dayId)
  } catch (error) {
    return { ok: false, message: failure(error).error! }
  }
}

/** Check-in from the response's page, for a ticket without its QR. */
export async function checkInByIdAction(formId: string, responseId: string, dayId: string): Promise<ActionState> {
  const { staff } = await requireFormAccess(formId)
  try {
    const { result } = await checkIn(formId, responseId, dayId, staff, new Date())
    revalidatePath(`/staff/${formId}/responses/${responseId}`)
    if (result.kind === "refused") return { error: SCAN_REFUSALS[result.reason] }
    return { done: Date.now(), message: result.kind === "again" ? "Already checked in." : "Checked in." }
  } catch (error) {
    return failure(error)
  }
}

export async function undoCheckInAction(formId: string, responseId: string, dayId: string): Promise<ActionState> {
  await requireFormAccess(formId)
  try {
    await undoCheckIn(formId, responseId, dayId, new Date())
    revalidatePath(`/staff/${formId}/responses/${responseId}`)
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}

function identityFrom(formData: FormData): Partial<Identity> {
  return {
    name: str(formData, "name"),
    email: str(formData, "email"),
    wechatId: str(formData, "wechatId"),
    campus: str(formData, "campus") as Identity["campus"],
  }
}

/**
 * Walk-in sign-up: someone without a ticket registers at the door. Created
 * checked in for `dayId`; the email is optional, and if given gets the ticket.
 */
export async function doorAddAction(
  formId: string,
  dayId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { staff, form } = await requireFormAccess(formId)
  const raw = identityFrom(formData)
  const errors: Record<string, string> = {}
  const name = (raw.name ?? "").replace(/\s+/g, " ")
  const email = normalizeEmail(raw.email ?? "")
  if (!name) errors.name = "Write their name."
  if (email && !isEmail(email)) errors.email = "This email isn't valid."
  const campus = (CAMPUS_IDS as readonly string[]).includes(raw.campus ?? "") || raw.campus === "other" ? raw.campus! : ""
  const ticketTypeId = str(formData, "ticketTypeId")
  if (!ticketTypeId) errors.ticketTypeId = "Choose a ticket type."
  if (Object.keys(errors).length) return { fieldErrors: errors }

  try {
    const response = await createResponse(
      newResponseId(),
      {
        formId,
        identity: { name: name.slice(0, 100), email, wechatId: (raw.wechatId ?? "").slice(0, 60), campus },
        answers: {},
        ticketTypeId,
        source: "door",
        deviceKey: "",
        checkIn: { dayId, byUid: staff.uid, byName: staff.name },
      },
      new Date()
    )
    if (email) await sendResponseEmail(form, response, await siteOrigin())
    return { done: Date.now(), message: `${response.identity.name} is signed up and checked in. Code ${response.code}.` }
  } catch (error) {
    return failure(error)
  }
}

/* -------------------------------------------------------------------------
   One response
   ------------------------------------------------------------------------- */

async function responseOfForm(formId: string, responseId: string) {
  const response = await getResponse(responseId)
  if (!response || response.formId !== formId) throw new FormError("RESPONSE_NOT_FOUND")
  return response
}

/** Organizers fix a name (a transferred ticket), an email (a typo or a bounce) or the ticket type. */
export async function editResponseAction(
  formId: string,
  responseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { form } = await requireFormAccess(formId)
  try {
    const response = await responseOfForm(formId, responseId)
    const settings = effectiveSettings(form.settings, form.tickets)
    const raw = identityFrom(formData)
    const { identity, errors } = checkIdentity(form, raw)
    // A door registration may have no email; keep it that way unless one is typed.
    if (response.source === "door" && !raw.email) delete errors.email
    if (!settings.collectContact && response.source !== "door") Object.assign(identity, { wechatId: "", campus: "" })
    if (Object.keys(errors).length) return { fieldErrors: errors }
    const ticketTypeId = form.tickets.enabled ? str(formData, "ticketTypeId") || response.ticketTypeId : null
    const { emailChanged } = await updateResponseByStaff(responseId, { identity, ticketTypeId }, new Date())
    revalidatePath(`/staff/${formId}/responses/${responseId}`)
    if (emailChanged && identity.email) {
      const updated = await responseOfForm(formId, responseId)
      await sendResponseEmail(form, updated, await siteOrigin())
      return { done: Date.now(), message: `Saved, and sent again to ${identity.email}.` }
    }
    return { done: Date.now(), message: "Saved." }
  } catch (error) {
    return failure(error)
  }
}

export async function resendEmailAction(formId: string, responseId: string): Promise<ActionState> {
  const { form } = await requireFormAccess(formId)
  try {
    const response = await responseOfForm(formId, responseId)
    if (!response.identity.email) throw new FormError("NO_EMAIL")
    await sendResponseEmail(form, response, await siteOrigin())
    revalidatePath(`/staff/${formId}/responses/${responseId}`)
    return { done: Date.now(), message: `Sent again to ${response.identity.email}.` }
  } catch (error) {
    return failure(error)
  }
}

export async function cancelResponseAction(formId: string, responseId: string): Promise<ActionState> {
  await requireFormAccess(formId)
  try {
    await responseOfForm(formId, responseId)
    await cancelResponse(responseId, "organizer", new Date())
    revalidatePath(`/staff/${formId}/responses/${responseId}`)
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}
