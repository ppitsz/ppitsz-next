import { createHash, randomUUID } from "node:crypto"
import { cookies, headers } from "next/headers"

/*
 * Who is asking, for spam limits. A device is a random id in a long-lived
 * cookie, and the network is the client address. Neither is proof of
 * identity: clearing cookies gives a new device. They only make spamming
 * tedious; the unpaid-order limit per account in the store does the rest.
 */

const DEVICE_COOKIE = "shop_device"
const DEVICE_PATTERN = /^[0-9a-f-]{36}$/

/**
 * The device's id, set on first use. Only server actions and route handlers
 * may set cookies, so call this from there.
 */
export async function deviceId() {
  const jar = await cookies()
  const existing = jar.get(DEVICE_COOKIE)?.value
  if (existing && DEVICE_PATTERN.test(existing)) return existing
  const id = randomUUID()
  jar.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  })
  return id
}

/** What gets stored on an order: a hash, never the cookie itself. */
export function deviceKeyOf(id: string) {
  return createHash("sha256").update(`device:${id}`).digest("hex").slice(0, 32)
}

/** The client address. Vercel sets x-forwarded-for itself, so it can't be spoofed there. */
export async function clientIp() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local"
}
