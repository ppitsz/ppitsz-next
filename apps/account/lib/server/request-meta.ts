import { headers } from "next/headers"

/** The client address, for spam limits. Vercel sets x-forwarded-for itself, so it can't be spoofed there. */
export async function clientIp() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local"
}
