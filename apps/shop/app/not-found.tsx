import { accountOrigin } from "@ppitsz/accounts/urls"
import { getBuyer } from "@/lib/server/auth"
import { SiteChrome } from "@/components/site-chrome"
import { NotFoundMessage } from "@/components/not-found-message"

/**
 * URLs that match no route render here with only the root layout, so this
 * one brings the shop header. A notFound() inside a section uses that
 * section's own not-found, under its own header.
 */
export default async function NotFound() {
  const buyer = await getBuyer()
  return (
    <SiteChrome buyerName={buyer ? buyer.name : null} accountHref={accountOrigin()}>
      <NotFoundMessage />
    </SiteChrome>
  )
}
