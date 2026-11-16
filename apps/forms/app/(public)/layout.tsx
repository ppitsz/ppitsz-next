import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin, signInUrl, transferApps } from "@ppitsz/accounts/urls"
import { siteOrigin } from "@/lib/server/site-url"
import { SiteChrome } from "@/components/site-chrome"

/** Responder pages: the form, its ticket or response, and the list of open forms. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome
      me={await menuAccount()}
      signInHref={signInUrl(`${await siteOrigin()}/`)}
      accountHref={accountOrigin()}
      transfers={transferApps("forms")}
    >
      {children}
    </SiteChrome>
  )
}
