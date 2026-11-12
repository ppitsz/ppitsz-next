import { createHash } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { db } from "@ppitsz/accounts/firebase"

/*
 * Fixed-window request counters in Firestore, the shop's (apps/shop
 * lib/store/rate-limit.ts), sharing its rateLimits collection and its TTL
 * policy on expiresAt. Keys are prefixed "account:" and hashed.
 */

export interface Limit {
  max: number
  windowMs: number
}

const MINUTE = 60_000

export const LIMITS = {
  // Generous: a whole dormitory can share one address.
  signUpPerIp: { max: 10, windowMs: 60 * MINUTE },
  resetPerIp: { max: 10, windowMs: 60 * MINUTE },
  resetPerEmail: { max: 3, windowMs: 60 * MINUTE },
  signInPerIp: { max: 20, windowMs: 10 * MINUTE },
  signInPerEmail: { max: 10, windowMs: 10 * MINUTE },
  googlePerIp: { max: 20, windowMs: 10 * MINUTE },
} satisfies Record<string, Limit>

export const RATE_LIMITED = "Too many tries. Wait a few minutes, then try again."

/** Counts one request against every key; false when any is over its limit. Fails open. */
export async function allowRequest(checks: { key: string; limit: Limit }[], now = new Date()): Promise<boolean> {
  try {
    const results = await Promise.all(checks.map(({ key, limit }) => hit(`account:${key}`, limit, now)))
    return results.every(Boolean)
  } catch (error) {
    console.error("rate limit check failed", error)
    return true
  }
}

async function hit(key: string, limit: Limit, now: Date) {
  const ref = db().collection("rateLimits").doc(createHash("sha256").update(key).digest("hex").slice(0, 40))
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
