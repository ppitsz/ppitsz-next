import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requireStaff } from "@/lib/server/auth"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { listBundles, listCampaigns, listProducts } from "@/lib/store"
import { BundleForm } from "@/components/staff/bundle-form"
import { bundleFormProducts } from "../products"

export const metadata: Metadata = { title: "Add bundle" }

export default async function NewBundlePage() {
  await requireStaff("admin")
  const campaign = await pickedCampaign(await listCampaigns())
  if (!campaign) redirect("/staff/settings")
  const [products, bundles] = await Promise.all([
    listProducts(campaign.id, { includeInactive: true }),
    listBundles(campaign.id, { includeInactive: true }),
  ])
  const nextSort = bundles.reduce((max, b) => Math.max(max, b.sortOrder), 0) + 1

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <Link as={NextLink} href="/staff/products" variant="standalone" className="self-start">
          All products
        </Link>
        <p className="type-kicker text-accent-text">{campaign.name}</p>
        <h1 className="type-display-xl text-text">Add bundle</h1>
      </div>
      <BundleForm
        campaignId={campaign.id}
        bundle={null}
        products={bundleFormProducts(products)}
        pickup={{ offers: campaign.offers, pickupPoints: campaign.pickupPoints.map((p) => ({ id: p.id })) }}
        defaultSortOrder={nextSort}
      />
    </Container>
  )
}
