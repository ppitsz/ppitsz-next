import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin, transferApps } from "@ppitsz/accounts/urls"
import { SiteChrome } from "@/components/site-chrome"

/** The buyer's pages: the shop header, with the signed-in buyer's profile menu, and the footer. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome me={await menuAccount()} accountHref={accountOrigin()} transfers={transferApps("shop")}>
      {children}
    </SiteChrome>
  )
}
