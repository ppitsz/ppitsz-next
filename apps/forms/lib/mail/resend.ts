import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

/*
 * Sending one email through Resend's HTTP API. No Google: Gmail sending
 * would need OAuth and its API is blocked in China anyway.
 *
 * Without RESEND_API_KEY (local development) the email is written to
 * .outbox/ as an HTML file instead, with inline images made viewable.
 */

export interface Attachment {
  filename: string
  /** Base64. */
  content: string
  contentType: string
  /** Set for an inline image, referenced from the HTML as cid:<contentId>. */
  contentId?: string
}

export interface Outgoing {
  from: "ticket" | "default"
  to: string
  subject: string
  html: string
  text: string
  attachments: Attachment[]
  /** Resend refuses a second send with the same key within 24 hours: a retry after a timeout can't double-send. */
  idempotencyKey: string
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string; retry: boolean }

function sender(from: Outgoing["from"]) {
  return from === "ticket"
    ? (process.env.MAIL_FROM_TICKET ?? "PPIT Shenzhen <tickets@ppitshenzhen.org>")
    : (process.env.MAIL_FROM_DEFAULT ?? "PPIT Shenzhen <noreply@ppitshenzhen.org>")
}

export function mailConfigured() {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(mail: Outgoing): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === "production") return { ok: false, error: "RESEND_API_KEY is not set", retry: false }
    return writeToOutbox(mail)
  }
  let res: Response
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": mail.idempotencyKey,
      },
      body: JSON.stringify({
        from: sender(mail.from),
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
        attachments: mail.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
          ...(a.contentId ? { content_id: a.contentId } : {}),
        })),
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    return { ok: false, error: `network: ${String(error)}`, retry: true }
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
  if (res.ok && data.id) return { ok: true, id: data.id }
  // 429 (rate limit) and 5xx are worth another try; a 4xx (bad address, unverified domain) is not.
  return {
    ok: false,
    error: `${res.status} ${data.name ?? ""} ${data.message ?? ""}`.trim(),
    retry: res.status === 429 || res.status >= 500,
  }
}

async function writeToOutbox(mail: Outgoing): Promise<SendResult> {
  const dir = path.join(process.cwd(), ".outbox")
  await mkdir(dir, { recursive: true })
  let html = mail.html
  for (const a of mail.attachments) {
    if (a.contentId) html = html.replaceAll(`cid:${a.contentId}`, `data:${a.contentType};base64,${a.content}`)
  }
  const id = `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const safeTo = mail.to.replace(/[^a-z0-9@._-]/gi, "_")
  const file = path.join(dir, `${id}-${safeTo}.html`)
  await writeFile(file, `<!-- To: ${mail.to} · Subject: ${mail.subject} -->\n${html}`)
  for (const a of mail.attachments) {
    if (!a.contentId) await writeFile(path.join(dir, `${id}-${a.filename}`), Buffer.from(a.content, "base64"))
  }
  console.log(`[outbox] ${mail.to}: ${mail.subject} → ${file}`)
  return { ok: true, id }
}
