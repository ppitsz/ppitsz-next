import type { Metadata } from "next"
import NextLink from "next/link"

import { Badge } from "@ppitsz/ui/components/badge"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { formatDate, formatYuan } from "@ppitsz/ui/lib/format"
import { requireStaff } from "@/lib/server/auth"
import { CATEGORY_LABELS, mediaUrl } from "@/lib/catalog"
import { availability } from "@/lib/domain/stock"
import { contentsLabel } from "@/lib/domain/bundle"
import { saleWindow } from "@/lib/domain/product"
import { CATEGORIES, type Bundle, type Product, type Variant } from "@/lib/domain/types"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { listBundles, listCampaigns, listProducts } from "@/lib/store"
import { CampaignSwitcher } from "@/components/staff/campaign-switcher"
import { Allergens, ProductTags } from "@/components/product-labels"

export const metadata: Metadata = { title: "Products" }

export default async function ProductsPage() {
  await requireStaff("admin")
  const campaigns = await listCampaigns()
  const campaign = await pickedCampaign(campaigns)
  const [products, bundles] = campaign
    ? await Promise.all([
        listProducts(campaign.id, { includeInactive: true }),
        listBundles(campaign.id, { includeInactive: true }),
      ])
    : [[], []]
  const names = new Map(products.map((p) => [p.id, p.name]))

  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          {campaign ? (
            <CampaignSwitcher campaigns={campaigns} currentId={campaign.id} />
          ) : (
            <p className="type-kicker text-accent-text">No campaigns yet</p>
          )}
          <h1 className="type-display-xl text-text">Products</h1>
        </div>
        {campaign && (
          <div className="flex flex-wrap gap-3">
            {products.length > 0 && (
              <NextLink href="/staff/products/bundles/new" className={buttonVariants()}>
                Add bundle
              </NextLink>
            )}
            <NextLink href="/staff/products/new" className={buttonVariants({ variant: "primary" })}>
              Add product
            </NextLink>
          </div>
        )}
      </div>

      {!campaign ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No campaigns yet.</EmptyTitle>
            <EmptyDescription>
              <NextLink href="/staff/settings">Create the campaign first</NextLink>, then add products.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : products.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No products yet.</EmptyTitle>
            <EmptyDescription>Products you add show up in the catalog and the kasir right away.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {bundles.length > 0 && (
            <section aria-labelledby="products-bundles" className="flex flex-col gap-2">
              <h2 id="products-bundles" className="type-heading-lg text-text">
                Bundles
              </h2>
              <ul className="@container flex flex-col">
                {bundles.map((bundle) => (
                  <BundleRow key={bundle.id} bundle={bundle} names={names} />
                ))}
              </ul>
            </section>
          )}
          {CATEGORIES.map((category) => {
          const inCategory = products.filter((p) => p.category === category)
          if (inCategory.length === 0) return null
          return (
            <section key={category} aria-labelledby={`products-${category}`} className="flex flex-col gap-2">
              <h2 id={`products-${category}`} className="type-heading-lg text-text">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="@container flex flex-col">
                {inCategory.map((product) => (
                  <ProductRow key={product.id} product={product} hasBooth={campaign.offers.booth} />
                ))}
              </ul>
            </section>
          )
          })}
        </>
      )}
    </Container>
  )
}

function BundleRow({ bundle, names }: { bundle: Bundle; names: Map<string, string> }) {
  const contents = contentsLabel(
    bundle.components.map((c) => ({ name: names.get(c.productId) ?? "deleted product", variantLabel: "", qty: c.qty }))
  )
  return (
    <li className="border-t last:border-b">
      <NextLink
        href={`/staff/products/bundles/${bundle.id}`}
        className="group grid gap-4 py-4 hover:bg-surface-strong @2xl:grid-cols-[4rem_minmax(0,1fr)_minmax(0,2fr)] @2xl:px-2"
      >
        {bundle.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by /media
          <img src={mediaUrl(bundle.imagePath)} alt="" className="hidden size-16 rounded-lg bg-surface object-cover @2xl:block" />
        ) : (
          <span aria-hidden className="hidden size-16 rounded-lg bg-surface @2xl:block" />
        )}
        <span className="flex flex-col items-start gap-1">
          <span className="type-heading-sm text-text underline-offset-4 group-hover:underline">{bundle.name}</span>
          {!bundle.active && <Badge variant="neutral">Not for sale</Badge>}
        </span>
        <span className="flex flex-col">
          <span className="type-body-sm text-text">{formatYuan(bundle.priceFen)}</span>
          <span className="type-caption text-muted">{contents} · stock from its products</span>
        </span>
      </NextLink>
    </li>
  )
}

function ProductRow({ product, hasBooth }: { product: Product; hasBooth: boolean }) {
  return (
    <li className="border-t last:border-b">
      <NextLink
        href={`/staff/products/${product.id}`}
        className="group grid gap-4 py-4 hover:bg-surface-strong @2xl:grid-cols-[4rem_minmax(0,1fr)_minmax(0,2fr)] @2xl:px-2"
      >
        {product.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by /media
          <img src={mediaUrl(product.imagePath)} alt="" className="hidden size-16 rounded-lg bg-surface object-cover @2xl:block" />
        ) : (
          <span aria-hidden className="hidden size-16 rounded-lg bg-surface @2xl:block" />
        )}
        <span className="flex flex-col items-start gap-1">
          <span className="type-heading-sm text-text underline-offset-4 group-hover:underline">{product.name}</span>
          {!product.active && <Badge variant="neutral">Not for sale</Badge>}
          <SaleDates product={product} />
          <ProductTags tags={product.tags} />
          <Allergens allergens={product.allergens} />
        </span>
        <ul className="flex flex-col gap-2">
          {product.variants.map((v) => (
            <li key={v.id} className="flex flex-col">
              <span className="type-body-sm text-text">
                {v.label ? `${v.label} · ` : ""}
                {formatYuan(v.priceFen)}
              </span>
              <StockLine variant={v} hasBooth={hasBooth} />
            </li>
          ))}
        </ul>
      </NextLink>
    </li>
  )
}

/** A seasonal product's dates: not on sale yet, over, or on sale until a date. */
function SaleDates({ product }: { product: Product }) {
  const phase = saleWindow(product, new Date())
  if (phase === "upcoming") return <Badge>From {formatDate(product.onSaleFrom!)}</Badge>
  if (phase === "ended") return <Badge variant="neutral">Sale dates ended</Badge>
  if (product.onSaleUntil) {
    return <span className="type-caption text-muted">On sale until {formatDate(product.onSaleUntil)}</span>
  }
  return null
}

function StockLine({ variant, hasBooth }: { variant: Variant; hasBooth: boolean }) {
  const { remaining } = availability(variant)
  if (!hasBooth) {
    return (
      <span className={remaining <= 5 ? "type-caption text-warning-text" : "type-caption text-muted"}>
        Stock {variant.stock} · online {variant.onlineOrdered} · left {remaining}
      </span>
    )
  }
  const cap =
    variant.onlineCap === null
      ? `online ${variant.onlineOrdered}`
      : variant.onlineCap === 0
        ? "khusus booth"
        : `online ${variant.onlineOrdered}/${variant.onlineCap}`
  return (
    <span className={remaining <= 5 ? "type-caption text-warning-text" : "type-caption text-muted"}>
      Stock {variant.stock} · {cap} · booth {variant.walkIn} · left {remaining}
    </span>
  )
}
