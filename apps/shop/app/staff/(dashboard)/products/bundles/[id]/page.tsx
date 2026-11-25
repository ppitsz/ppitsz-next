import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requireStaff } from "@/lib/server/auth"
import { mediaUrl } from "@/lib/catalog"
import { getBundle, getCampaign, listProducts } from "@/lib/store"
import { BundleForm, DeleteBundleButton } from "@/components/staff/bundle-form"
import { bundleFormProducts } from "../products"

export const metadata: Metadata = { title: "Edit bundle" }

export default async function EditBundlePage({ params }: PageProps<"/staff/products/bundles/[id]">) {
  await requireStaff("admin")
  const { id } = await params
  const bundle = await getBundle(id)
  const campaign = bundle && (await getCampaign(bundle.campaignId))
  if (!bundle || !campaign) notFound()
  const products = await listProducts(campaign.id, { includeInactive: true })

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <Link as={NextLink} href="/staff/products" variant="standalone" className="self-start">
          All products
        </Link>
        <p className="type-kicker text-accent-text">{campaign.name}</p>
        <h1 className="type-display-xl text-text">{bundle.name}</h1>
      </div>
      <BundleForm
        campaignId={campaign.id}
        bundle={{ ...bundle, imageUrl: bundle.imagePath ? mediaUrl(bundle.imagePath) : undefined }}
        products={bundleFormProducts(products)}
        pickup={{ offers: campaign.offers, pickupPoints: campaign.pickupPoints.map((p) => ({ id: p.id })) }}
        defaultSortOrder={bundle.sortOrder}
      />
      <div className="flex flex-col items-start gap-2 border-t pt-6">
        <DeleteBundleButton campaignId={campaign.id} bundleId={bundle.id} name={bundle.name} />
      </div>
    </Container>
  )
}
