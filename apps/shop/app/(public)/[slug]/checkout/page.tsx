import type { Metadata } from "next"
import { connection } from "next/server"
import { notFound, redirect } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { toCatalog } from "@/lib/catalog"
import { requireBuyer } from "@/lib/server/auth"
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
  const [products, bundles, places] = await Promise.all([
    listProducts(campaign.id, { includeInactive: true, now }),
    listBundles(campaign.id),
    slotPlaces(campaign, now),
  ])
  const catalog = toCatalog(campaign, products, bundles, { now, slotPlaces: places })

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">{campaign.name}</p>
        <h1 className="type-display-xl text-text">Checkout</h1>
      </div>
      <CheckoutForm
        catalog={catalog}
        profile={{ name: buyer.name, wechatId: buyer.wechatId, phone: buyer.phone }}
      />
    </Container>
  )
}
