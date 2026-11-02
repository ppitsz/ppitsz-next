import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requireStaff } from "@/lib/server/auth"
import { mediaUrl } from "@/lib/catalog"
import { isUnsold } from "@/lib/domain/product"
import { getCampaign, getProduct, listBundles } from "@/lib/store"
import { DeleteProductButton, ProductForm } from "@/components/staff/product-form"

export const metadata: Metadata = { title: "Edit product" }

export default async function EditProductPage({ params }: PageProps<"/staff/products/[id]">) {
  await requireStaff("admin")
  const { id } = await params
  const product = await getProduct(id)
  const campaign = product && (await getCampaign(product.campaignId))
  if (!product || !campaign) notFound()
  const inBundles = (await listBundles(campaign.id, { includeInactive: true })).filter((b) =>
    b.components.some((c) => c.productId === product.id)
  )

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <Link as={NextLink} href="/staff/products" variant="standalone" className="self-start">
          All products
        </Link>
        <p className="type-kicker text-accent-text">{campaign.name}</p>
        <h1 className="type-display-xl text-text">{product.name}</h1>
      </div>
      <ProductForm
        campaignId={campaign.id}
        hasBooth={campaign.offers.booth}
        product={{
          ...product,
          imageUrl: product.imagePath ? mediaUrl(product.imagePath) : undefined,
          sizeChartUrl: product.sizeChartPath ? mediaUrl(product.sizeChartPath) : undefined,
        }}
        defaultSortOrder={product.sortOrder}
      />
      <div className="flex flex-col items-start gap-2 border-t pt-6">
        {!isUnsold(product) ? (
          <p className="type-body-sm text-muted">
            This product has been ordered or sold, so it can't be deleted. Untick For sale to
            hide it from the catalog and the kasir.
          </p>
        ) : inBundles.length > 0 ? (
          <p className="type-body-sm text-muted">
            This product is in {inBundles.map((b) => b.name).join(", ")}. Remove it from those bundles first to
            delete it.
          </p>
        ) : (
          <DeleteProductButton campaignId={campaign.id} productId={product.id} name={product.name} />
        )}
      </div>
    </Container>
  )
}
