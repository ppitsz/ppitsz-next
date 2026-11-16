import { createHash } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { db } from "../firebase/admin"

/*
 * Fixed-window request counters in Firestore, shared by every server
 * instance, as in the shop (its own collection, so the two never collide).
 * Loose on purpose: two requests at a window's edge may both start a new
 * window. Keys are hashed; each document carries `expiresAt` for a TTL policy.
 * There is no captcha: reCAPTCHA and Turnstile don't load reliably in China.
 */

export interface Limit {
  /** Requests allowed per window. */
  max: number
  windowMs: number
}

const MINUTE = 60_000

export const LIMITS = {
  submitPerDevice: { max: 20, windowMs: 10 * MINUTE },
  // Generous: a whole dormitory can share one address.
  submitPerIp: { max: 120, windowMs: 10 * MINUTE },
  resendPerEmail: { max: 3, windowMs: 60 * MINUTE },
  accessPerEmail: { max: 3, windowMs: 60 * MINUTE },
  accessPerIp: { max: 30, windowMs: 60 * MINUTE },
} satisfies Record<string, Limit>

/**
 * Counts one request against every key; false when any of them is over its
 * limit. Fails open: a broken counter must not lock responders out.
 */
export async function allowRequest(checks: { key: string; limit: Limit }[], now = new Date()): Promise<boolean> {
  try {
    const results = await Promise.all(checks.map(({ key, limit }) => hit(key, limit, now)))
    return results.every(Boolean)
  } catch (error) {
    console.error("rate limit check failed", error)
    return true
  }
}

async function hit(key: string, limit: Limit, now: Date) {
  const ref = db().collection("formRateLimits").doc(createHash("sha256").update(key).digest("hex").slice(0, 40))
  const snap = await ref.get()
  const start = (snap.get("windowStart") as Timestamp | undefined)?.toMillis() ?? 0
  if (!snap.exists || start + limit.windowMs <= now.getTime()) {
    await ref.set({
      count: 1,
      windowStart: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromMillis(now.getTime() + limit.windowMs),
    })
    return true
  }
  if ((snap.get("count") as number) >= limit.max) return false
  await ref.update({ count: FieldValue.increment(1) })
  return true
}
