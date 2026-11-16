import type { Metadata } from "next"

import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin, signInUrl, transferApps } from "@ppitsz/accounts/urls"
import { siteOrigin } from "@/lib/server/site-url"
import { SiteChrome } from "@/components/site-chrome"
import { NotFoundMessage } from "@/components/not-found-message"

export const metadata: Metadata = { title: "Page not found" }

/** URLs that match no route render here with only the root layout, so this one brings the header. */
export default async function NotFound() {
  return (
    <SiteChrome
      me={await menuAccount()}
      signInHref={signInUrl(`${await siteOrigin()}/`)}
      accountHref={accountOrigin()}
      transfers={transferApps("forms")}
    >
      <NotFoundMessage />
    </SiteChrome>
  )
}
