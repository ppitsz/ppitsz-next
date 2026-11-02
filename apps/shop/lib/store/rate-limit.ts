import { createHash } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { db } from "../firebase/admin"

/*
 * Fixed-window request counters in Firestore, shared by every server
 * instance. Loose on purpose: two requests at a window's edge may both start
 * a new window. That is fine for slowing down spam, and it avoids a
 * transaction, which would make a busy key (a campus NAT address) contend.
 *
 * Keys are hashed, so no IP address or device id is stored as is. Each
 * document carries `expiresAt` for a Firestore TTL policy to clean up
 * (see README, Production).
 */

export interface Limit {
  /** Requests allowed per window. */
  max: number
  windowMs: number
}

const MINUTE = 60_000

export const LIMITS = {
  checkoutPerDevice: { max: 10, windowMs: 10 * MINUTE },
  // Generous: a whole dormitory can share one address.
  checkoutPerIp: { max: 60, windowMs: 10 * MINUTE },
  proofPerOrder: { max: 10, windowMs: 60 * MINUTE },
} satisfies Record<string, Limit>

/**
 * Counts one request against every key; false when any of them is over its
 * limit. Fails open: if Firestore is unreachable, the request itself will
 * fail anyway, and a broken counter must not lock buyers out.
 */
export async function allowRequest(
  checks: { key: string; limit: Limit }[],
  now = new Date()
): Promise<boolean> {
  try {
    const results = await Promise.all(checks.map(({ key, limit }) => hit(key, limit, now)))
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
