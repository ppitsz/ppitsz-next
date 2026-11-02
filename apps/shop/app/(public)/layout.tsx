import { accountOrigin } from "@ppitsz/accounts/urls"
import { getBuyer } from "@/lib/server/auth"
import { SiteChrome } from "@/components/site-chrome"

/** The buyer's pages: the shop header, with the signed-in buyer, and the footer. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const buyer = await getBuyer()
  return (
    <SiteChrome buyerName={buyer ? buyer.name : null} accountHref={accountOrigin()}>
      {children}
    </SiteChrome>
  )
}
