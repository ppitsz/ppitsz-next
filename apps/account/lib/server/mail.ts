import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

/*
 * The one email this app sends: a password reset link, through Resend's
 * HTTP API like Forms (ADR 0005). Firebase's own reset email would link to
 * its hosted page, which needs Google.
 *
 * Email clients ignore stylesheets and CSS variables, so the body carries
 * inline styles with the Jaringan light palette written out, as Forms does.
 *
 * Without RESEND_API_KEY the email is written to .outbox/ as an HTML file
 * instead, and the page shows the link. In production without it, Firebase
 * sends its own email instead (forgotPasswordAction).
 */

export function mailConfigured() {
  return !!process.env.RESEND_API_KEY
}

const C = { text: "#1b1a19", muted: "#5f5b57", border: "#dcd8d3", surface: "#f4f2ef", accent: "#c8102e" }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function resetHtml(url: string) {
  const small = (text: string) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${C.muted}">${text}</p>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Set your password</title></head>
<body style="margin:0;padding:0;background:${C.surface};font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.border};border-radius:16px">
<tr><td style="padding:28px 28px 8px">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:${C.accent}">PPITSZ Account</p>
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;color:${C.text}">Set your password</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${C.text}">Open this link to set a new password for your PPITSZ account. It's the one account for the shop, Forms and every other PPIT Shenzhen app.</p>
<p style="margin:8px 0 24px"><a href="${esc(url)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${C.accent};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none">Set password</a></p>
${small("This link works once and expires in an hour. If you didn't ask for it, ignore this email.")}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${C.border}">${small("PPI Tiongkok Cabang Shenzhen · account.ppitshenzhen.org")}</td></tr>
</table></td></tr></table></body></html>`
}

/** Sends the reset link to `to`. Throws when Resend refuses it, so the page can say so. */
export async function sendResetEmail(to: string, url: string) {
  const subject = "Set your PPITSZ account password"
  const html = resetHtml(url)
  const text = `Set your PPITSZ account password: ${url}\n\nThis link works once and expires in an hour.\n`
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set")
    const dir = path.join(process.cwd(), ".outbox")
    await mkdir(dir, { recursive: true })
    const file = path.join(dir, `outbox-${Date.now()}-${to.replace(/[^a-z0-9@._-]/gi, "_")}.html`)
    await writeFile(file, `<!-- To: ${to} · Subject: ${subject} -->\n${html}`)
    console.log(`[outbox] ${to}: ${subject} → ${file}`)
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM_DEFAULT ?? "PPIT Shenzhen <noreply@ppitshenzhen.org>",
      to: [to],
      subject,
      html,
      text,
      ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Resend refused the reset email: ${res.status} ${await res.text().catch(() => "")}`)
}
