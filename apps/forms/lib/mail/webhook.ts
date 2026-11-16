import { createHmac, timingSafeEqual } from "node:crypto"

import type { MailStatus } from "../domain/types"

/*
 * Resend's delivery webhooks are signed the Svix way: HMAC-SHA256 over
 * "<id>.<timestamp>.<body>" with the base64 secret after "whsec_", sent as
 * one or more "v1,<base64>" in the svix-signature header.
 */

const TOLERANCE_S = 5 * 60

export function verifyWebhook(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = Date.now()
) {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  const sentAt = Number(timestamp)
  if (!Number.isFinite(sentAt) || Math.abs(now / 1000 - sentAt) > TOLERANCE_S) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest()
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",")
    if (version !== "v1" || !value) return false
    const given = Buffer.from(value, "base64")
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

/** The status a Resend event means for the email, or null for events we don't track. */
export function statusOfEvent(type: string): MailStatus | null {
  switch (type) {
    case "email.sent":
      return "sent"
    case "email.delivered":
      return "delivered"
    case "email.delivery_delayed":
      return "delayed"
    case "email.bounced":
      return "bounced"
    case "email.complained":
      return "complained"
    case "email.failed":
      return "failed"
    default:
      return null
  }
}

/** A later event never moves a final status back ("delivered" after "bounced" can't happen, "sent" after "delivered" can). */
const RANK: Record<MailStatus, number> = {
  queued: 0,
  sent: 1,
  delayed: 2,
  delivered: 3,
  bounced: 4,
  complained: 4,
  failed: 4,
}

export function shouldReplace(current: MailStatus | undefined, next: MailStatus) {
  return current === undefined || RANK[next] >= RANK[current]
}
