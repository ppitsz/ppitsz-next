"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { newId } from "../domain/codes"
import { blankSection, DEFAULT_SETTINGS, NO_TICKETS, type Definition } from "../domain/definition"
import { ERROR_MESSAGES, FormError } from "../domain/errors"
import { isEmail, normalizeEmail, slugify } from "../domain/form"
import { FORM_STATUSES, type FormStatus } from "../domain/types"
import { mailConfigured } from "../mail/resend"
import { requireAdmin, requireFormAccess } from "../server/auth"
import { sendBroadcast, sendInvite } from "../server/notify"
import { siteOrigin } from "../server/site-url"
import { resetLink } from "@ppitsz/accounts/passwords"
import { accountOrigin, signInUrl } from "@ppitsz/accounts/urls"
import { ensureAccount } from "../server/staff"
import {
  addBroadcast,
  addTeamMember,
  cancelEvent,
  copyForm,
  createForm,
  listResponses,
  removeTeamMember,
  saveDefinition,
  setFormCover,
  setFormStatus,
} from "../store"
import { copyCover, deleteMediaQuietly, uploadCover } from "../store/media"
import { failure, str, type ActionState } from "./state"

/*
 * Form admin actions: creating and building forms, their status, cover and
 * organizers. Messages to ticket holders and canceling the event are open to
 * the form's organizers too.
 */

const staffPath = (formId: string) => `/staff/${formId}`

/** A new draft form, with or without tickets, then on to the builder. */
export async function createFormAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const title = str(formData, "title").slice(0, 120)
  if (!title) return { fieldErrors: { title: "Write the form's title." } }
  const withTickets = formData.get("tickets") === "on"
  const now = new Date()
  const today = new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10)
  const dayId = newId()
  const definition: Definition = {
    title,
    slug: `${slugify(title)}-${newId().slice(0, 4)}`.slice(0, 50),
    description: "",
    line: "bph",
    unlisted: false,
    opensAt: null,
    closesAt: null,
    settings: DEFAULT_SETTINGS,
    sections: [blankSection()],
    tickets: withTickets
      ? {
          enabled: true,
          venue: "",
          capacity: null,
          days: [{ id: dayId, date: today, starts: "", ends: "" }],
          types: [
            { id: newId(), name: "Reguler", description: "", quota: null, salesStart: null, salesEnd: null, dayIds: [] },
          ],
        }
      : NO_TICKETS,
  }
  let id: string
  try {
    id = await createForm(definition, now)
  } catch (error) {
    return failure(error)
  }
  redirect(`${staffPath(id)}/edit`)
}

/** The builder's save: the whole definition as JSON. */
export async function saveFormAction(formId: string, json: string): Promise<ActionState> {
  await requireAdmin()
  try {
    const result = await saveDefinition(formId, JSON.parse(json), new Date())
    if (!result.ok) return { error: result.error }
    revalidatePath(staffPath(formId), "layout")
    return { done: Date.now(), message: "Form saved." }
  } catch (error) {
    return failure(error)
  }
}

export async function setStatusAction(formId: string, status: FormStatus): Promise<ActionState> {
  await requireAdmin()
  if (!FORM_STATUSES.includes(status)) return { error: ERROR_MESSAGES.INVALID_FORM }
  try {
    await setFormStatus(formId, status, new Date())
    revalidatePath(staffPath(formId), "layout")
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}

/** Upload a cover (the page shrinks it first), or remove it with `remove`. */
export async function coverAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  try {
    let path: string | null = null
    if (formData.get("remove") !== "1") {
      const file = formData.get("cover")
      if (!(file instanceof File) || file.size === 0) return { fieldErrors: { cover: "Choose a cover image." } }
      path = await uploadCover(formId, { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type })
    }
    const old = await setFormCover(formId, path)
    await deleteMediaQuietly(old)
    revalidatePath(staffPath(formId), "layout")
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}

/** Duplicate form: a draft with the same sections, questions, ticket types and team. */
export async function copyFormAction(formId: string): Promise<ActionState> {
  await requireAdmin()
  const { form } = await requireFormAccess(formId)
  let id: string
  try {
    const now = new Date()
    // The copy gets its own cover file, so deleting one never breaks the other.
    const cover = form.coverPath ? await copyCover(form.coverPath, form.id) : undefined
    id = await copyForm(form, cover, now)
  } catch (error) {
    return failure(error)
  }
  redirect(`${staffPath(id)}/edit`)
}

/* -------------------------------------------------------------------------
   Organizers
   ------------------------------------------------------------------------- */

/**
 * Adds someone to the form's organizers by email. Without an account yet, one
 * is made with no password, and the email carries a link to set it.
 */
export async function addMemberAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const { form } = await requireFormAccess(formId)
  const email = normalizeEmail(str(formData, "email"))
  const name = str(formData, "name").slice(0, 100)
  const fieldErrors: Record<string, string> = {}
  if (!isEmail(email)) fieldErrors.email = "This email isn't valid."
  if (!name) fieldErrors.name = "Write their name."
  if (Object.keys(fieldErrors).length) return { fieldErrors }
  try {
    const account = await ensureAccount(email, name)
    await addTeamMember(formId, { uid: account.uid, email, name: account.name })
    const origin = await siteOrigin()
    // Signing in and first passwords happen on PPITSZ Account (ADR 0008).
    const url = account.hasPassword ? signInUrl(`${origin}/staff`) : await resetLink(email, accountOrigin())
    await sendInvite(form, { email, name: account.name }, url, !account.hasPassword)
    revalidatePath(`${staffPath(formId)}/organizers`)
    return {
      done: Date.now(),
      message: `${account.name} was added and told by email.`,
      devLink: !mailConfigured() && process.env.NODE_ENV !== "production" ? url : undefined,
    }
  } catch (error) {
    return failure(error)
  }
}

export async function removeMemberAction(formId: string, uid: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await removeTeamMember(formId, uid)
    revalidatePath(`${staffPath(formId)}/organizers`)
    return { done: Date.now() }
  } catch (error) {
    return failure(error)
  }
}

/* -------------------------------------------------------------------------
   Messages to ticket holders
   ------------------------------------------------------------------------- */

/**
 * Sends the organizers' announcement to every live ticket. With kind "cancel", the
 * event is canceled first: the form closes and every ticket is voided.
 */
export async function broadcastAction(formId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { staff, form } = await requireFormAccess(formId)
  const kind = formData.get("kind") === "cancel" ? "cancel" : "change"
  const subject = str(formData, "subject").slice(0, 120)
  const body = str(formData, "body").slice(0, 5000)
  if (!subject || !body) return { error: ERROR_MESSAGES.MESSAGE_REQUIRED }
  if (kind === "cancel" && str(formData, "confirm") !== form.title) {
    return { fieldErrors: { confirm: "Type the form's title exactly to cancel the event." } }
  }
  try {
    const now = new Date()
    if (form.cancelledAt) throw new FormError("EVENT_CANCELLED")
    const recipients =
      kind === "cancel" ? await cancelEvent(formId, now) : (await listResponses(formId)).filter((r) => r.status === "live")
    const sent = await sendBroadcast(form, recipients, { subject, body, cancelled: kind === "cancel" }, await siteOrigin())
    await addBroadcast(formId, { id: newId(), kind, subject, body, sentAt: now, byName: staff.name, recipients: sent })
    revalidatePath(staffPath(formId), "layout")
    return {
      done: Date.now(),
      message:
        kind === "cancel"
          ? `Event canceled. ${sent} ticket ${sent === 1 ? "holder was" : "holders were"} told by email.`
          : `Announcement sent to ${sent} ticket ${sent === 1 ? "holder" : "holders"}.`,
    }
  } catch (error) {
    return failure(error)
  }
}
