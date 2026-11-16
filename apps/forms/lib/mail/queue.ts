import { after } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import type { MailState, MailStatus } from "../domain/types"
import { db } from "../firebase/admin"
import { reportError } from "../server/alerts"
import { setResponseMail } from "../store"
import { compact } from "../store/revive"
import { sendEmail, type Attachment, type Outgoing } from "./resend"
import { shouldReplace } from "./webhook"

/*
 * The send queue, in Firestore (formMails). An email is queued in the same
 * request that needs it and sent right after the response goes out, so a
 * responder never waits for Resend. What fails is retried with backoff by
 * the next send, the dashboard and the cron. Bodies are deleted once sent:
 * access codes and reset links don't stay in the database.
 *
 * Resend allows a few requests per second, so a broadcast to 800 ticket
 * holders is sent paced, a batch per run, over a few minutes.
 */

export type MailKind = "ticket" | "confirmation" | "access" | "invite" | "reset" | "broadcast"

interface QueuedMail extends Omit<Outgoing, "idempotencyKey"> {
  kind: MailKind
  formId: string | null
  /** Set when this email's delivery shows on the response (its ticket or receipt). */
  responseId: string | null
  status: "queued" | "sending" | "sent" | "failed"
  attempts: number
  nextAttemptAt: Date
  leaseUntil: Date | null
  resendId: string | null
  delivery: MailStatus | null
  lastError: string | null
  createdAt: Date
  sentAt: Date | null
}

const mails = () => db().collection("formMails")

const MAX_ATTEMPTS = 6
/** 1, 4, 16, 64 minutes… */
const backoff = (attempts: number) => 60_000 * 4 ** (attempts - 1)
const LEASE_MS = 2 * 60_000
/** Under Resend's default of 2 requests per second. */
const PACE_MS = 550

export interface NewMail {
  kind: MailKind
  from: Outgoing["from"]
  to: string
  subject: string
  html: string
  text: string
  attachments?: Attachment[]
  formId?: string
  /** Tracks this email's delivery on the response. */
  responseId?: string
}

/** Queues the emails and starts sending them after this request. Returns their ids. */
export async function queueMail(list: NewMail[], now = new Date()): Promise<string[]> {
  const batch = db().batch()
  const ids: string[] = []
  for (const mail of list) {
    const ref = mails().doc()
    ids.push(ref.id)
    const doc: QueuedMail = {
      kind: mail.kind,
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments ?? [],
      formId: mail.formId ?? null,
      responseId: mail.responseId ?? null,
      status: "queued",
      attempts: 0,
      nextAttemptAt: now,
      leaseUntil: null,
      resendId: null,
      delivery: null,
      lastError: null,
      createdAt: now,
      sentAt: null,
    }
    batch.create(ref, compact(doc))
  }
  await batch.commit()
  await Promise.all(
    list.flatMap((mail) => (mail.responseId ? [setResponseMail(mail.responseId, { status: "queued", at: now })] : []))
  )
  sendSoon(ids)
  return ids
}

/** Sends `ids` (or whatever is due) once the response is out. */
export function sendSoon(ids?: string[]) {
  const run = () => (ids ? sendMails(ids) : processQueue()).catch((error) => reportError(error, "mail queue"))
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * Takes one email for sending, unless another run holds it or it isn't due.
 * The update is conditional on the document not having changed since it was
 * read, so two runs racing for one email can't both take it.
 */
async function claim(id: string, now: Date): Promise<QueuedMail | null> {
  const ref = mails().doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const mail = snap.data() as Record<string, unknown>
  const due = (mail.nextAttemptAt as FirebaseFirestore.Timestamp).toMillis() <= now.getTime()
  const leaseOver = !mail.leaseUntil || (mail.leaseUntil as FirebaseFirestore.Timestamp).toMillis() < now.getTime()
  const takeable = (mail.status === "queued" && due) || (mail.status === "sending" && leaseOver)
  if (!takeable) return null
  try {
    await ref.update(
      { status: "sending", leaseUntil: new Date(now.getTime() + LEASE_MS) },
      { lastUpdateTime: snap.updateTime! }
    )
  } catch {
    // Another run took it first.
    return null
  }
  return mail as unknown as QueuedMail
}

async function sendOne(id: string) {
  const now = new Date()
  const mail = await claim(id, now)
  if (!mail) return false
  const result = await sendEmail({
    from: mail.from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: mail.attachments,
    idempotencyKey: `forms-${id}`,
  })
  const attempts = mail.attempts + 1
  const ref = mails().doc(id)
  if (result.ok) {
    await ref.update({
      status: "sent",
      resendId: result.id,
      sentAt: now,
      attempts,
      leaseUntil: null,
      lastError: null,
      html: FieldValue.delete(),
      text: FieldValue.delete(),
      attachments: FieldValue.delete(),
    })
    if (mail.responseId) await trackOnResponse(mail.responseId, { status: "sent", at: now })
    return true
  }
  const final = !result.retry || attempts >= MAX_ATTEMPTS
  await ref.update({
    status: final ? "failed" : "queued",
    attempts,
    leaseUntil: null,
    lastError: result.error,
    nextAttemptAt: new Date(now.getTime() + backoff(attempts)),
  })
  if (final) {
    if (mail.responseId) await trackOnResponse(mail.responseId, { status: "failed", at: now, detail: result.error })
    reportError(new Error(`Email to response ${mail.responseId ?? "-"} failed: ${result.error}`), `mail ${mail.kind}`)
  }
  return true
}

async function sendMails(ids: string[]) {
  for (const [i, id] of ids.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PACE_MS))
    await sendOne(id)
  }
}

/** Sends what is due: new emails, retries and abandoned sends. At most `limit` per run. */
export async function processQueue(limit = 200) {
  const now = Date.now()
  const [queued, sending] = await Promise.all([
    mails().where("status", "==", "queued").limit(1000).get(),
    mails().where("status", "==", "sending").limit(200).get(),
  ])
  const due = [...queued.docs, ...sending.docs]
    .filter((d) =>
      d.get("status") === "queued"
        ? d.get("nextAttemptAt").toMillis() <= now
        : !d.get("leaseUntil") || d.get("leaseUntil").toMillis() < now
    )
    .sort((a, b) => a.get("createdAt").toMillis() - b.get("createdAt").toMillis())
    .slice(0, limit)
  await sendMails(due.map((d) => d.id))
  return due.length
}

/** Emails still waiting, for the dashboard to nudge the queue. */
export async function hasDueMail() {
  const snap = await mails().where("status", "==", "queued").limit(1).get()
  return !snap.empty && snap.docs[0]!.get("nextAttemptAt").toMillis() <= Date.now()
}

async function trackOnResponse(responseId: string, state: MailState) {
  try {
    await setResponseMail(responseId, state)
  } catch (error) {
    // A response purged or removed meanwhile: nothing to track.
    console.error("could not track mail on response", responseId, error)
  }
}

/** A Resend webhook event for one of our emails. */
export async function recordDelivery(resendId: string, status: MailStatus, detail: string | undefined, at: Date) {
  const snap = await mails().where("resendId", "==", resendId).limit(1).get()
  if (snap.empty) return false
  const doc = snap.docs[0]!
  const current = (doc.get("delivery") as MailStatus | null) ?? undefined
  if (!shouldReplace(current, status)) return true
  await doc.ref.update({ delivery: status, ...(detail ? { lastError: detail } : {}) })
  const responseId = doc.get("responseId") as string | null
  if (responseId) await trackOnResponse(responseId, compact({ status, at, detail }))
  return true
}
