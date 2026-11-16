import { createHash } from "node:crypto"
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore"

import { newCode, newToken } from "../domain/codes"
import { parseDraft, type Definition } from "../domain/definition"
import { FormError } from "../domain/errors"
import { effectiveSettings, formPhase, isFull } from "../domain/form"
import { assertTypeAvailable, countsAfter, scanDecision, type ScanResult } from "../domain/tickets"
import type {
  Answers,
  Broadcast,
  Form,
  FormResponse,
  FormStatus,
  Identity,
  MailState,
  TeamMember,
} from "../domain/types"
import { db } from "../firebase/admin"
import { fromDoc, toDoc } from "./revive"

/*
 * Firestore access for forms and responses. Every change to a quota, a lock
 * or a check-in runs in a transaction, so two people taking the last place, or
 * two phones scanning one ticket, can't both win.
 *
 * Collections (all prefixed: the shop and the old website share the project,
 * and the old website already has `forms`, readable by anyone, ADR 0013):
 *   formDefs/{id}              Form
 *   formResponses/{id}         FormResponse, with formId
 *   formLocks/{formId_kind_h}  one live response per email (e) or device (d)
 *   formAccessCodes/{formId_h} the 6-digit code for getting back to a response
 * Queries use equality filters only, which need no composite index.
 */

const forms = () => db().collection("formDefs")
const responses = () => db().collection("formResponses")
const locks = () => db().collection("formLocks")
const accessCodes = () => db().collection("formAccessCodes")

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32)

const FORM_DEFAULTS: Partial<Form> = {
  coverPath: undefined,
  unlisted: false,
  team: [],
  teamUids: [],
  seen: {},
  broadcasts: [],
  checkInDays: [],
  cancelledAt: null,
  doneAt: null,
  purgedAt: null,
}

const formOf = (snap: FirebaseFirestore.DocumentSnapshot) => fromDoc<Form>(snap, FORM_DEFAULTS)
const responseOf = (snap: FirebaseFirestore.DocumentSnapshot) =>
  fromDoc<FormResponse>(snap, { checkIns: {}, mail: null, accountUid: null })

const byNewest = <T extends { createdAt: Date }>(list: T[]) => list.sort((a, b) => +b.createdAt - +a.createdAt)

/* -------------------------------------------------------------------------
   Forms
   ------------------------------------------------------------------------- */

export async function getForm(id: string): Promise<Form | null> {
  const snap = await forms().doc(id).get()
  return snap.exists ? formOf(snap) : null
}

/** Every form, newest first: the admin's list. */
export async function listForms(): Promise<Form[]> {
  return byNewest((await forms().get()).docs.map(formOf))
}

/** The forms `uid` organizes. */
export async function listMemberForms(uid: string): Promise<Form[]> {
  return byNewest((await forms().where("teamUids", "array-contains", uid).get()).docs.map(formOf))
}

/** Open, listed forms, for the home page: soonest closing first. */
export async function listPublicForms(now: Date): Promise<Form[]> {
  const open = (await forms().where("status", "==", "open").get()).docs.map(formOf)
  return open
    .filter((f) => !f.unlisted && formPhase(f, now) !== "ended")
    .sort((a, b) => (a.closesAt?.getTime() ?? Infinity) - (b.closesAt?.getTime() ?? Infinity))
}

/**
 * The form at an address. An ended form's address may be reused, so the
 * live one wins; otherwise the newest ended form still answers its old link.
 */
export async function getFormBySlug(slug: string): Promise<Form | null> {
  const found = byNewest((await forms().where("slug", "==", slug).get()).docs.map(formOf))
  return found.find((f) => f.status !== "done") ?? found[0] ?? null
}

async function assertSlugFree(tx: Transaction, slug: string, selfId: string | null) {
  const taken = await tx.get(forms().where("slug", "==", slug))
  if (taken.docs.some((d) => d.id !== selfId && d.get("status") !== "done")) throw new FormError("SLUG_TAKEN")
}

/** A new draft form. */
export async function createForm(definition: Definition, now: Date): Promise<string> {
  const ref = forms().doc()
  await db().runTransaction(async (tx) => {
    await assertSlugFree(tx, definition.slug, null)
    const form: Form = {
      ...(FORM_DEFAULTS as Form),
      ...definition,
      id: ref.id,
      status: "draft",
      counts: { total: 0, live: 0, byType: {} },
      createdAt: now,
      updatedAt: now,
    }
    tx.create(ref, toDoc(form))
  })
  return ref.id
}

export type SaveResult = { ok: true } | { ok: false; error: string }

/** Saves a builder draft, checked against the form as it is inside the transaction. */
export async function saveDefinition(id: string, draft: unknown, now: Date): Promise<SaveResult> {
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(forms().doc(id))
    if (!snap.exists) throw new FormError("NOT_FOUND")
    const parsed = parseDraft(draft, formOf(snap))
    if (!parsed.ok) return parsed
    await assertSlugFree(tx, parsed.definition.slug, id)
    tx.update(snap.ref, { ...toDoc({ id, ...parsed.definition }), updatedAt: now })
    return { ok: true } as const
  })
}

export async function setFormStatus(id: string, status: FormStatus, now: Date) {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(forms().doc(id))
    if (!snap.exists) throw new FormError("NOT_FOUND")
    const form = formOf(snap)
    // Reopening an ended form must not clash with a newer form at its address.
    if (form.status === "done" && status !== "done") await assertSlugFree(tx, form.slug, id)
    tx.update(snap.ref, {
      status,
      updatedAt: now,
      doneAt: status === "done" ? (form.doneAt ?? now) : null,
    })
  })
}

/** Sets or clears the cover; returns the old path, for the caller to delete. */
export async function setFormCover(id: string, path: string | null) {
  const ref = forms().doc(id)
  const old = (await ref.get()).get("coverPath") as string | undefined
  await ref.update({ coverPath: path ?? FieldValue.delete() })
  return old
}

/** A draft copy: settings, questions, ticket types and team, with no responses. */
export async function copyForm(source: Form, coverPath: string | undefined, now: Date) {
  const ref = forms().doc()
  await db().runTransaction(async (tx) => {
    let slug = `${source.slug}-copy`.slice(0, 50)
    for (let n = 2; ; n++) {
      const taken = await tx.get(forms().where("slug", "==", slug))
      if (taken.empty) break
      slug = `${source.slug.slice(0, 44)}-copy${n}`
    }
    const copy: Form = {
      ...source,
      ...(FORM_DEFAULTS as Form),
      id: ref.id,
      slug,
      title: `${source.title} (copy)`.slice(0, 120),
      coverPath,
      team: source.team,
      teamUids: source.teamUids,
      status: "draft",
      counts: { total: 0, live: 0, byType: {} },
      createdAt: now,
      updatedAt: now,
    }
    tx.create(ref, toDoc(copy))
  })
  return ref.id
}

export async function addTeamMember(id: string, member: TeamMember) {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(forms().doc(id))
    if (!snap.exists) throw new FormError("NOT_FOUND")
    const form = formOf(snap)
    const team = [...form.team.filter((m) => m.uid !== member.uid), member]
    tx.update(snap.ref, { team, teamUids: team.map((m) => m.uid) })
  })
}

export async function removeTeamMember(id: string, uid: string) {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(forms().doc(id))
    if (!snap.exists) throw new FormError("NOT_FOUND")
    const team = formOf(snap).team.filter((m) => m.uid !== uid)
    tx.update(snap.ref, { team, teamUids: team.map((m) => m.uid) })
  })
}

/** Remembers how many responses `uid` has seen, for the "new" count. */
export async function markSeen(id: string, uid: string, total: number) {
  await forms().doc(id).update({ [`seen.${uid}`]: total })
}

export async function addBroadcast(id: string, broadcast: Broadcast) {
  await forms().doc(id).update({ broadcasts: FieldValue.arrayUnion(broadcast) })
}

/* -------------------------------------------------------------------------
   Responses: reading
   ------------------------------------------------------------------------- */

export async function getResponse(id: string): Promise<FormResponse | null> {
  const snap = await responses().doc(id).get()
  return snap.exists ? responseOf(snap) : null
}

export async function getResponseByToken(token: string): Promise<FormResponse | null> {
  const snap = await responses().where("token", "==", token).limit(1).get()
  return snap.empty ? null : responseOf(snap.docs[0]!)
}

export async function findResponseByCode(formId: string, code: string): Promise<FormResponse | null> {
  const snap = await responses().where("formId", "==", formId).where("code", "==", code).limit(1).get()
  return snap.empty ? null : responseOf(snap.docs[0]!)
}

/** A form's responses, newest first. */
export async function listResponses(formId: string): Promise<FormResponse[]> {
  return byNewest((await responses().where("formId", "==", formId).get()).docs.map(responseOf))
}

/** The live responses made with `email` on a form, newest first. */
export async function responsesByEmail(formId: string, email: string): Promise<FormResponse[]> {
  const snap = await responses().where("formId", "==", formId).where("identity.email", "==", email).get()
  return byNewest(snap.docs.map(responseOf).filter((r) => r.status === "live"))
}

/* -------------------------------------------------------------------------
   Responses: changes
   ------------------------------------------------------------------------- */

const emailLock = (formId: string, email: string) => locks().doc(`${formId}_e_${hash(email)}`)
const deviceLock = (formId: string, deviceKey: string) => locks().doc(`${formId}_d_${deviceKey}`)

/** The locks a live response holds. */
function locksOf(form: Form, response: Pick<FormResponse, "identity" | "deviceKey">): DocumentReference[] {
  const settings = effectiveSettings(form.settings, form.tickets)
  if (!settings.oneResponse) return []
  if (response.identity.email) return [emailLock(form.id, response.identity.email)]
  if (!settings.collectEmail && response.deviceKey) return [deviceLock(form.id, response.deviceKey)]
  return []
}

async function readForm(tx: Transaction, id: string) {
  const snap = await tx.get(forms().doc(id))
  if (!snap.exists) throw new FormError("NOT_FOUND")
  return formOf(snap)
}

async function readResponse(tx: Transaction, id: string) {
  const snap = await tx.get(responses().doc(id))
  if (!snap.exists) throw new FormError("RESPONSE_NOT_FOUND")
  return responseOf(snap)
}

export interface NewResponse {
  formId: string
  identity: Identity
  answers: Answers
  ticketTypeId: string | null
  source: FormResponse["source"]
  deviceKey: string
  /** The signed-in account, on a form that collects names and emails. */
  accountUid?: string | null
  /** A door registration is checked in on the spot. */
  checkIn?: { dayId: string; byUid: string; byName: string }
}

/** A fresh document id, so file answers can be uploaded under it before the response exists. */
export function newResponseId() {
  return responses().doc().id
}

/**
 * Adds a response, taking a place in its ticket type and the form's caps.
 * Online responses need the form taking responses; door registrations need
 * it open or closed (registration over, event still on), and skip sale dates.
 */
export async function createResponse(id: string, input: NewResponse, now: Date): Promise<FormResponse> {
  return db().runTransaction(async (tx) => {
    const form = await readForm(tx, input.formId)
    const door = input.source === "door"
    if (form.cancelledAt) throw new FormError("EVENT_CANCELLED")
    if (door) {
      if (form.status !== "open" && form.status !== "closed") throw new FormError("CLOSED")
    } else {
      const phase = formPhase(form, now)
      if (phase === "upcoming" || phase === "draft") throw new FormError("NOT_OPEN")
      // "full" is settled below, after the lock check.
      if (phase !== "open" && phase !== "full") throw new FormError("CLOSED")
    }
    // Before the quota: someone registering again gets their ticket re-sent, even when it is full.
    const draft = { identity: input.identity, deviceKey: input.deviceKey }
    const lockRefs = locksOf(form, draft)
    const held = await Promise.all(lockRefs.map((ref) => tx.get(ref)))
    if (held.some((s) => s.exists)) {
      throw new FormError(input.identity.email ? "ALREADY_RESPONDED" : "ALREADY_RESPONDED_DEVICE")
    }
    if (form.tickets.enabled) assertTypeAvailable(form, input.ticketTypeId, now, { door })
    else if (isFull(form)) throw new FormError("FULL")

    let code = newCode()
    for (let i = 0; i < 5; i++) {
      const clash = await tx.get(responses().where("formId", "==", form.id).where("code", "==", code).limit(1))
      if (clash.empty) break
      code = newCode()
    }

    const response: FormResponse = {
      id,
      formId: form.id,
      token: newToken(),
      code,
      status: "live",
      identity: input.identity,
      answers: input.answers,
      ticketTypeId: form.tickets.enabled ? input.ticketTypeId : null,
      checkIns: input.checkIn
        ? { [input.checkIn.dayId]: { at: now, byUid: input.checkIn.byUid, byName: input.checkIn.byName } }
        : {},
      mail: null,
      source: input.source,
      deviceKey: input.deviceKey,
      accountUid: input.accountUid ?? null,
      cancelledAt: null,
      cancelledBy: null,
      createdAt: now,
      updatedAt: now,
    }
    tx.create(responses().doc(id), toDoc(response))
    for (const ref of lockRefs) tx.set(ref, { formId: form.id, responseId: id })
    tx.update(forms().doc(form.id), {
      counts: countsAfter(form, response.ticketTypeId, 1),
      ...(input.checkIn ? { checkInDays: FieldValue.arrayUnion(input.checkIn.dayId) } : {}),
    })
    return response
  })
}

/** May the responder still change this response? */
export function responderMayEdit(form: Form, response: FormResponse, now: Date) {
  if (response.status !== "live" || !form.settings.editable || form.cancelledAt) return false
  return form.status === "open" && !(form.closesAt && now >= form.closesAt)
}

/**
 * The responder's own edit: name, contact and answers. The email and the
 * ticket type stay; organizers can change those.
 */
export async function updateOwnResponse(
  responseId: string,
  patch: { identity: Pick<Identity, "name" | "wechatId" | "campus">; answers: Answers },
  now: Date
) {
  return db().runTransaction(async (tx) => {
    const response = await readResponse(tx, responseId)
    const form = await readForm(tx, response.formId)
    if (!responderMayEdit(form, response, now)) throw new FormError("NOT_EDITABLE")
    tx.update(responses().doc(responseId), {
      identity: { ...response.identity, ...patch.identity },
      answers: patch.answers,
      updatedAt: now,
    })
    return { before: response, form }
  })
}

/** Organizers' edit: who the ticket is for (a transfer), its email and type. */
export async function updateResponseByStaff(
  responseId: string,
  patch: { identity: Identity; ticketTypeId: string | null },
  now: Date
) {
  return db().runTransaction(async (tx) => {
    const response = await readResponse(tx, responseId)
    const form = await readForm(tx, response.formId)
    if (response.status !== "live") throw new FormError("CANCELLED")

    const oldLocks = locksOf(form, response)
    const next = { ...response, identity: patch.identity }
    const newLocks = locksOf(form, next)
    const added = newLocks.filter((ref) => !oldLocks.some((o) => o.path === ref.path))
    const held = await Promise.all(added.map((ref) => tx.get(ref)))
    if (held.some((s) => s.exists)) throw new FormError("ALREADY_RESPONDED")

    let counts = form.counts
    const typeChanged = form.tickets.enabled && patch.ticketTypeId !== response.ticketTypeId
    if (typeChanged) {
      // Out of the old type first, so the move itself is never refused for its own place.
      const without: Form = { ...form, counts: countsAfter(form, response.ticketTypeId, -1) }
      assertTypeAvailable(without, patch.ticketTypeId, now, { door: true })
      counts = countsAfter(without, patch.ticketTypeId, 1)
      counts.total = form.counts.total
    }

    for (const ref of oldLocks) if (!newLocks.some((n) => n.path === ref.path)) tx.delete(ref)
    for (const ref of added) tx.set(ref, { formId: form.id, responseId })
    tx.update(responses().doc(responseId), {
      identity: patch.identity,
      ticketTypeId: typeChanged ? patch.ticketTypeId : response.ticketTypeId,
      updatedAt: now,
    })
    if (typeChanged) tx.update(forms().doc(form.id), { counts })
    return { before: response, emailChanged: response.identity.email !== patch.identity.email }
  })
}

/** Cancels a live response; its place goes back to the quota and its email may respond again. */
export async function cancelResponse(responseId: string, by: "self" | "organizer", now: Date) {
  return db().runTransaction(async (tx) => {
    const response = await readResponse(tx, responseId)
    const form = await readForm(tx, response.formId)
    if (response.status !== "live") throw new FormError("CANCELLED")
    for (const ref of locksOf(form, response)) tx.delete(ref)
    tx.update(responses().doc(responseId), { status: "cancelled", cancelledAt: now, cancelledBy: by, updatedAt: now })
    tx.update(forms().doc(form.id), { counts: countsAfter(form, response.ticketTypeId, -1) })
    return { form, response }
  })
}

/**
 * Records a check-in for `dayId`, or says why not. Returns the response as it
 * is afterwards.
 */
export async function checkIn(
  formId: string,
  responseId: string,
  dayId: string,
  staff: { uid: string; name: string },
  now: Date
): Promise<{ result: ScanResult; response: FormResponse; form: Form }> {
  return db().runTransaction(async (tx) => {
    const form = await readForm(tx, formId)
    const response = await readResponse(tx, responseId)
    if (response.formId !== formId) throw new FormError("RESPONSE_NOT_FOUND")
    if (!form.tickets.days.some((d) => d.id === dayId)) throw new FormError("INVALID_FORM")
    const result = scanDecision(form, response, dayId)
    if (result.kind !== "checked_in") return { result, response, form }
    const entry = { at: now, byUid: staff.uid, byName: staff.name }
    tx.update(responses().doc(responseId), { [`checkIns.${dayId}`]: entry, updatedAt: now })
    tx.update(forms().doc(formId), { checkInDays: FieldValue.arrayUnion(dayId) })
    return { result, response: { ...response, checkIns: { ...response.checkIns, [dayId]: entry } }, form }
  })
}

export async function undoCheckIn(formId: string, responseId: string, dayId: string, now: Date) {
  const ref = responses().doc(responseId)
  const snap = await ref.get()
  if (!snap.exists || snap.get("formId") !== formId) throw new FormError("RESPONSE_NOT_FOUND")
  await ref.update({ [`checkIns.${dayId}`]: FieldValue.delete(), updatedAt: now })
}

export async function setResponseMail(responseId: string, mail: MailState) {
  await responses().doc(responseId).update({ mail })
}

/**
 * Cancels the event: the form closes and every live ticket is voided.
 * Returns the tickets that were live, for the cancellation email.
 */
export async function cancelEvent(formId: string, now: Date): Promise<FormResponse[]> {
  const form = await db().runTransaction(async (tx) => {
    const form = await readForm(tx, formId)
    if (form.cancelledAt) throw new FormError("EVENT_CANCELLED")
    tx.update(forms().doc(formId), {
      cancelledAt: now,
      status: form.status === "done" ? "done" : "closed",
      updatedAt: now,
    })
    return form
  })
  const live = (await listResponses(formId)).filter((r) => r.status === "live")
  const writer = db().bulkWriter()
  for (const r of live) {
    void writer.update(responses().doc(r.id), { status: "cancelled", cancelledAt: now, cancelledBy: "event", updatedAt: now })
    for (const ref of locksOf(form, r)) void writer.delete(ref)
  }
  await writer.close()
  await forms().doc(formId).update({ counts: { total: form.counts.total, live: 0, byType: {} } })
  return live
}

/* -------------------------------------------------------------------------
   Getting back to a response
   ------------------------------------------------------------------------- */

const CODE_TTL_MS = 15 * 60_000
const CODE_ATTEMPTS = 5

const accessRef = (formId: string, email: string) => accessCodes().doc(`${formId}_${hash(email)}`)

export async function saveAccessCode(formId: string, email: string, code: string, now: Date) {
  await accessRef(formId, email).set({
    formId,
    codeHash: hash(`${formId}:${code}`),
    attempts: 0,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
  })
}

/** True once for the right code; a wrong one counts, and five wrong ones burn it. */
export async function useAccessCode(formId: string, email: string, code: string, now: Date) {
  return db().runTransaction(async (tx) => {
    const ref = accessRef(formId, email)
    const snap = await tx.get(ref)
    if (!snap.exists) return false
    const data = snap.data()!
    if (data.expiresAt.toDate() < now || data.attempts >= CODE_ATTEMPTS) {
      tx.delete(ref)
      return false
    }
    if (data.codeHash !== hash(`${formId}:${code}`)) {
      tx.update(ref, { attempts: FieldValue.increment(1) })
      return false
    }
    tx.delete(ref)
    return true
  })
}

/* -------------------------------------------------------------------------
   Purge
   ------------------------------------------------------------------------- */

/** Ended forms past the 90 days whose personal data is still there. */
export async function formsToPurge(now: Date, days = 90) {
  const done = (await forms().where("status", "==", "done").get()).docs.map(formOf)
  const cutoff = now.getTime() - days * 24 * 60 * 60_000
  return done.filter((f) => !f.purgedAt && f.doneAt && f.doneAt.getTime() < cutoff)
}

/**
 * Keeps name, campus, ticket type, check-ins and choice answers (the summary);
 * drops email, WeChat ID, the linked account, text and file answers. The caller deletes the files.
 */
export async function purgeResponses(form: Form, now: Date) {
  const choiceIds = new Set(
    form.sections.flatMap((s) => s.questions.filter((q) => q.type === "single" || q.type === "multi").map((q) => q.id))
  )
  const writer = db().bulkWriter()
  for (const r of await listResponses(form.id)) {
    const answers = Object.fromEntries(Object.entries(r.answers).filter(([qid]) => choiceIds.has(qid)))
    void writer.update(responses().doc(r.id), {
      "identity.email": "",
      "identity.wechatId": "",
      deviceKey: "",
      accountUid: null,
      answers,
    })
  }
  for (const lock of (await locks().where("formId", "==", form.id).get()).docs) void writer.delete(lock.ref)
  await writer.close()
  await forms().doc(form.id).update({ purgedAt: now })
}
