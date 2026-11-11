import type { Metadata } from "next"

import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin, transferApps } from "@ppitsz/accounts/urls"
import { SiteChrome } from "@/components/site-chrome"
import { NotFoundMessage } from "@/components/not-found-message"

export const metadata: Metadata = { title: "Page not found" }

/**
 * URLs that match no route render here with only the root layout, so this
 * one brings the shop header. A notFound() inside a section uses that
 * section's own not-found, under its own header.
 */
export default async function NotFound() {
  return (
    <SiteChrome me={await menuAccount()} accountHref={accountOrigin()} transfers={transferApps("shop")}>
      <NotFoundMessage />
    </SiteChrome>
  )
}
