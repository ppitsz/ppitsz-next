import { getDivision } from "@ppitsz/ui/lib/network"
import { RAW, RAW_LINES_ON_INK } from "@ppitsz/ui/lib/raw-colors"

import { daysOf } from "../domain/tickets"
import type { Form, FormResponse } from "../domain/types"
import { dayLabel, sortedDays } from "../form-copy"

/*
 * Email bodies. Email clients ignore stylesheets and CSS variables, so these
 * carry inline styles with the Jaringan palette as hex (@ppitsz/ui/lib/raw-colors).
 * Every email opens with the brand line; the ticket email draws the ticket
 * itself, ink with a white stub, so the inbox matches the ticket page.
 * Plain text goes along with every email. Copy is English, like the app (ADR 0007).
 */

export interface MailContent {
  subject: string
  html: string
  text: string
}

const C = {
  text: RAW.ink,
  muted: RAW.muted,
  border: RAW.border,
  surface: RAW.surface,
  accent: RAW.accent,
  accentText: RAW.accentText,
  line: RAW.accentLine,
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const para = (html: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${C.text}">${html}</p>`
const small = (html: string) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${C.muted}">${html}</p>`
const button = (href: string, label: string) =>
  `<p style="margin:8px 0 24px"><a href="${esc(href)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${C.accent};color:${RAW.white};font-size:16px;font-weight:600;text-decoration:none">${esc(label)}</a></p>`
/** Organizers' own words: escaped, with their line breaks kept. */
const prose = (text: string) => text.split(/\n{2,}/).map((p) => para(esc(p).replace(/\n/g, "<br>"))).join("")

function layout(kicker: string, title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.surface};font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${RAW.white};border:1px solid ${C.border};border-radius:16px">
<tr><td style="padding:28px 28px 8px">
<div style="height:6px;width:64px;margin:0 0 20px;border-radius:999px;background:${C.line}"></div>
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:${C.accentText}">${esc(kicker)}</p>
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;color:${C.text}">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${C.border}">${small("PPI Tiongkok Cabang Shenzhen · forms.ppitshenzhen.org")}</td></tr>
</table></td></tr></table></body></html>`
}

function eventLines(form: Form, response: FormResponse) {
  const type = form.tickets.types.find((t) => t.id === response.ticketTypeId)
  const days = sortedDays(daysOf(form, response.ticketTypeId))
  return [
    ["Name", response.identity.name],
    ["Ticket", type?.name ?? ""],
    ["Date", days.map(dayLabel).join("; ")],
    ["Venue", form.tickets.venue],
    ["Code", response.code],
  ].filter(([, v]) => v) as [string, string][]
}

/**
 * The ticket as the page draws it: an ink body on the division's line with
 * whose it is and its cells, and a white stub with the QR and the code,
 * along a dashed perforation. Email can't cut notches, so it has none.
 */
function ticketBlock(form: Form, response: FormResponse) {
  const line = RAW_LINES_ON_INK[form.line]
  const type = form.tickets.types.find((t) => t.id === response.ticketTypeId)
  const days = sortedDays(daysOf(form, response.ticketTypeId))
  const cells = [
    ["Date", days.map(dayLabel).join("; ")],
    ["Venue", form.tickets.venue],
  ].filter(([, v]) => v) as [string, string][]
  const cellRows = cells
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0 0"><p style="margin:0 0 2px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:${RAW.inkMuted}">${esc(k)}</p><p style="margin:0;font-size:15px;font-weight:600;color:${RAW.white}">${esc(v)}</p></td></tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:separate">
<tr><td style="background:${RAW.ink};border-radius:14px 14px 0 0;padding:20px 22px 22px">
<div style="height:6px;margin:0 0 18px;border-radius:999px;background:${line}"></div>
<p style="margin:0 0 12px"><span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${line};color:${RAW.ink};font-size:12px;font-weight:700;letter-spacing:0.02em">${esc(getDivision(form.line).badge)}</span><span style="padding-left:10px;font-size:13px;font-weight:600;color:${RAW.inkMuted}">${esc(type?.name ?? "Ticket")}</span></p>
<p style="margin:0;font-size:24px;line-height:1.2;font-weight:700;color:${RAW.white}">${esc(response.identity.name)}</p>
${cellRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;border-top:1px solid ${RAW.inkBorder}">${cellRows}</table>` : ""}
</td></tr>
<tr><td align="center" style="background:${RAW.white};border:1px solid ${C.border};border-top:2px dashed ${RAW.borderStrong};border-radius:0 0 14px 14px;padding:22px 22px 18px">
<img src="cid:qr" width="220" height="220" alt="Ticket QR code ${esc(response.code)}" style="display:block;width:220px;height:220px;margin:0 auto 14px">
<p style="margin:0 0 4px;font-size:13px;color:${C.muted}">If the QR code won't scan, say this code</p>
<p style="margin:0;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:0.06em;color:${C.text}">${esc(response.code)}</p>
</td></tr></table>`
}

/** The ticket, with its QR as an inline image (cid:qr): Gmail strips data: images. */
export function ticketMail(form: Form, response: FormResponse, url: string): MailContent {
  const lines = eventLines(form, response)
  const html = layout(
    "Ticket",
    form.title,
    para(`Hi ${esc(response.identity.name)}, you're signed up. Show this QR code at check-in.`) +
      ticketBlock(form, response) +
      button(url, "Open ticket") +
      small(
        "The ticket page is the real ticket; this email is a copy. The link is secret: whoever has it can use your ticket. If the QR code won't scan, say the code."
      )
  )
  const text = [
    `Ticket: ${form.title}`,
    "",
    `Hi ${response.identity.name}, you're signed up. Show the QR code on the ticket page at check-in.`,
    "",
    ...lines.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open ticket: ${url}`,
    "The link is secret: whoever has it can use your ticket.",
  ].join("\n")
  return { subject: `Your ticket: ${form.title}`, html, text }
}

/** A plain form's receipt, with the link back to the answers. */
export function confirmationMail(form: Form, response: FormResponse, url: string, editable: boolean): MailContent {
  const html = layout(
    "Answers sent",
    form.title,
    para(`Hi ${esc(response.identity.name)}, we've received your answers.`) +
      button(url, editable ? "See or edit your answers" : "See your answers") +
      small("Keep this email: its link opens your answers. Don't forward it to anyone.")
  )
  const text = `${form.title}\n\nHi ${response.identity.name}, we've received your answers.\n\n${editable ? "See or edit your answers" : "See your answers"}: ${url}\n`
  return { subject: `Answers sent: ${form.title}`, html, text }
}

export function accessCodeMail(form: Form, code: string, url: string): MailContent {
  const html = layout(
    "Access code",
    form.title,
    para("Your code to open your response:") +
      `<p style="margin:0 0 20px;font-size:36px;font-weight:700;letter-spacing:0.2em;color:${C.text}">${code}</p>` +
      para("Or open your response directly:") +
      button(url, "Open my response") +
      small("The code works for 15 minutes. If you didn't ask for it, ignore this email.")
  )
  const text = `${form.title}\n\nYour code to open your response: ${code}\nOr open it directly: ${url}\n\nThe code works for 15 minutes.`
  return { subject: `Code ${code} for ${form.title}`, html, text }
}

/** Organizers write `body`; every live ticket holder gets it with their ticket link. */
export function broadcastMail(form: Form, subject: string, body: string, url: string, cancelled: boolean): MailContent {
  const html = layout(
    cancelled ? "Event canceled" : "From PPIT Shenzhen",
    form.title,
    prose(body) + (cancelled ? "" : button(url, "Open ticket")) + small("This email went to every ticket holder.")
  )
  const text = `${form.title}\n\n${body}\n\n${cancelled ? "" : `Your ticket: ${url}\n`}`
  return { subject: `${subject} · ${form.title}`, html, text }
}

/** A new organizer: a link to set their password, or to sign in when they have one. */
export function inviteMail(form: Form, name: string, url: string, setPassword: boolean): MailContent {
  const html = layout(
    "Organizer",
    form.title,
    para(`Hi ${esc(name)}, you've been added as an organizer of <strong>${esc(form.title)}</strong> on PPITSZ Forms.`) +
      para(
        setPassword
          ? "Set a password for your PPITSZ account first, then sign in with this email. It's one account for every PPIT Shenzhen app."
          : "Sign in with your PPITSZ account, the same email and password as PPITSZ Shop."
      ) +
      button(url, setPassword ? "Set password" : "Sign in") +
      (setPassword ? small("This link works once and expires in an hour. Ask again with Forgot password.") : "")
  )
  const text = `You've been added as an organizer of ${form.title} on PPITSZ Forms.\n\n${setPassword ? "Set password" : "Sign in"}: ${url}\n`
  return { subject: `You're an organizer of ${form.title}`, html, text }
}
