import { headers } from "next/headers"

import { appOrigin, rootDomain } from "@ppitsz/accounts/urls"

/** The public origin, for links that leave the page (the order QR). */
export async function siteOrigin() {
  if (rootDomain()) return appOrigin("shop")
  // Locally, the host the page was opened on, so a phone on the LAN gets working links.
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
