import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { pickupPointLabel } from "@/lib/campaign-copy"
import { requireStaff } from "@/lib/server/auth"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { listCampaigns, listProducts } from "@/lib/store"
import { ProductForm } from "@/components/staff/product-form"

export const metadata: Metadata = { title: "Add product" }

export default async function NewProductPage() {
  await requireStaff("admin")
  const campaign = await pickedCampaign(await listCampaigns())
  if (!campaign) redirect("/staff/settings")
  const products = await listProducts(campaign.id, { includeInactive: true })
  const nextSort = products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <Link as={NextLink} href="/staff/products" variant="standalone" className="self-start">
          All products
        </Link>
        <p className="type-kicker text-accent-text">{campaign.name}</p>
        <h1 className="type-display-xl text-text">Add product</h1>
      </div>
      <ProductForm
        campaignId={campaign.id}
        product={null}
        defaultSortOrder={nextSort}
        hasBooth={campaign.offers.booth}
        pickupPoints={campaign.offers.pickup ? campaign.pickupPoints.map((p) => ({ id: p.id, label: pickupPointLabel(p) })) : []}
      />
    </Container>
  )
}
