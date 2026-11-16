import QRCode from "qrcode"

import { effectiveSettings } from "../domain/form"
import { daysOf } from "../domain/tickets"
import type { Form, FormResponse } from "../domain/types"
import { paths } from "../form-copy"
import { calendarFile } from "../mail/ics"
import { queueMail, type NewMail } from "../mail/queue"
import {
  accessCodeMail,
  broadcastMail,
  confirmationMail,
  inviteMail,
  ticketMail,
} from "../mail/templates"

/*
 * Which email goes out when, built from the form and the response. Every
 * one goes through the queue (lib/mail/queue.ts).
 */

/** The QR the scanner reads: the ticket's full link, so any phone camera also opens it. */
export function ticketUrl(origin: string, token: string) {
  return `${origin}${paths.response(token, true)}`
}

export async function qrPng(url: string) {
  return QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 3, width: 480, color: { dark: "#000000", light: "#ffffff" } })
}

export function ticketCalendar(form: Form, response: FormResponse, origin: string, now = new Date()) {
  return calendarFile({
    uid: response.id,
    title: form.title,
    venue: form.tickets.venue,
    url: ticketUrl(origin, response.token),
    days: daysOf(form, response.ticketTypeId),
    now,
  })
}

async function ticketEmail(form: Form, response: FormResponse, origin: string): Promise<NewMail> {
  const url = ticketUrl(origin, response.token)
  const content = ticketMail(form, response, url)
  return {
    kind: "ticket",
    from: "ticket",
    to: response.identity.email,
    ...content,
    attachments: [
      { filename: "qr.png", content: (await qrPng(url)).toString("base64"), contentType: "image/png", contentId: "qr" },
      {
        filename: "ticket.ics",
        content: Buffer.from(ticketCalendar(form, response, origin)).toString("base64"),
        contentType: "text/calendar",
      },
    ],
    formId: form.id,
    responseId: response.id,
  }
}

/**
 * The email a new (or re-sent) response gets: its ticket, or for a plain
 * form a receipt with the link back. Nothing for a response without email.
 */
export async function sendResponseEmail(form: Form, response: FormResponse, origin: string) {
  if (!response.identity.email || response.status !== "live") return false
  if (form.tickets.enabled) {
    await queueMail([await ticketEmail(form, response, origin)])
    return true
  }
  const url = `${origin}${paths.response(response.token, false)}`
  const editable = effectiveSettings(form.settings, form.tickets).editable
  await queueMail([
    {
      kind: "confirmation",
      from: "default",
      to: response.identity.email,
      ...confirmationMail(form, response, url, editable),
      formId: form.id,
      responseId: response.id,
    },
  ])
  return true
}

export async function sendAccessCode(form: Form, response: FormResponse, email: string, code: string, origin: string) {
  const url = `${origin}${paths.response(response.token, form.tickets.enabled)}`
  await queueMail([{ kind: "access", from: "default", to: email, ...accessCodeMail(form, code, url), formId: form.id }])
}

/** One email per recipient with their own ticket link. */
export async function sendBroadcast(
  form: Form,
  recipients: FormResponse[],
  { subject, body, cancelled }: { subject: string; body: string; cancelled: boolean },
  origin: string
) {
  const list = recipients.filter((r) => r.identity.email)
  if (list.length === 0) return 0
  await queueMail(
    list.map((r) => ({
      kind: "broadcast" as const,
      from: "ticket" as const,
      to: r.identity.email,
      ...broadcastMail(form, subject, body, ticketUrl(origin, r.token), cancelled),
      formId: form.id,
    }))
  )
  return list.length
}

export async function sendInvite(form: Form, to: { email: string; name: string }, url: string, setPassword: boolean) {
  await queueMail([{ kind: "invite", from: "default", to: to.email, ...inviteMail(form, to.name, url, setPassword), formId: form.id }])
}

