import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"
import { notFound, redirect } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { StationNameplate } from "@ppitsz/ui/components/network/station-nameplate"
import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { toCatalog } from "@/lib/catalog"
import { campaignRoute } from "@/lib/domain/order"
import { getStaff, requireBuyer } from "@/lib/server/auth"
import { visibleCampaign } from "@/lib/server/buyer-campaign"
import { listBundles, listProducts, slotPlaces } from "@/lib/store"
import { CheckoutForm } from "@/components/checkout-form"

export const metadata: Metadata = { title: "Checkout" }

export default async function CheckoutPage({ params }: PageProps<"/[slug]/checkout">) {
  await connection()
  const campaign = await visibleCampaign((await params).slug)
  if (!campaign) notFound()
  if (campaign.status === "closed") redirect(`/${campaign.slug}`)
  // Signing in comes back here; the cart waits on the phone meanwhile.
  const buyer = await requireBuyer(`/${campaign.slug}/checkout`)
  const now = new Date()
  const [products, bundles, places, staff] = await Promise.all([
    listProducts(campaign.id, { includeInactive: true, now }),
    listBundles(campaign.id),
    slotPlaces(campaign, now),
    getStaff(),
  ])
  const catalog = toCatalog(campaign, products, bundles, { now, slotPlaces: places, staff: !!staff })

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <StationNameplate
        kicker={campaign.name}
        name="Checkout"
        line="danus"
        lines={["danus"]}
        linkAs={NextLink}
        previous={{ label: campaign.name, href: `/${campaign.slug}` }}
        next={{ label: "Pay" }}
      >
        <StripMap
          line="danus"
          stops={campaignRoute(campaign.offers).map((label) => ({ label }))}
          current={0}
          aria-label="Order progress"
        />
      </StationNameplate>
      <CheckoutForm
        catalog={catalog}
        profile={{ name: buyer.name, wechatId: buyer.wechatId, phone: buyer.phone }}
      />
    </Container>
  )
}
