"use client"

import Link from "next/link"
import { useId, useState } from "react"
import { MinusIcon, PlusIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Badge } from "@ppitsz/ui/components/badge"
import { Button, buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { Route } from "@ppitsz/ui/components/network/route"
import { RouteStrip } from "@ppitsz/ui/components/network/route-strip"
import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"
import { cn } from "@ppitsz/ui/lib/utils"
import { CATEGORY_LABELS, type Catalog, type CatalogBundle, type CatalogProduct } from "@/lib/catalog"
import { bundlesLeft, contentsLabel } from "@/lib/domain/bundle"
import { MAX_QTY_PER_LINE, type CartChoice } from "@/lib/domain/cart"
import { campaignRoute } from "@/lib/domain/order"
import { CATEGORIES } from "@/lib/domain/types"
import { useCart } from "@/lib/client/local-store"
import { cartSummary } from "@/lib/client/cart-summary"
import { BundlePicks, defaultPicks } from "./bundle-picks"
import { Allergens, ProductTags } from "./product-labels"
import { SizeChartButton } from "./size-chart"

type Cart = ReturnType<typeof useCart>

/**
 * The catalog: bundles, then products by category, plus the cart bar. A
 * signed-out buyer can fill the cart; checkout asks them to sign in first.
 */
export function Shop({ catalog, signedIn }: { catalog: Catalog; signedIn: boolean }) {
  const cart = useCart(catalog.campaignId)
  const summary = cartSummary(cart.lines, catalog)
  const canOrder = catalog.window === "open"
  const categories = CATEGORIES.filter((category) => catalog.products.some((p) => p.category === category))
  // The catalog's stations: its sections, for the rail beside it.
  const sections = [
    ...(catalog.bundles.length > 0 ? [{ id: "category-bundles", label: "Bundles" }] : []),
    ...categories.map((category) => ({ id: `category-${category}`, label: CATEGORY_LABELS[category] })),
  ]
  const withRail = sections.length >= 2
  const lastStop = campaignRoute(catalog.offers).at(-1)

  return (
    <>
      <Container data-line="danus" className={cn("@container pb-16", summary.count > 0 && "pb-32")}>
        <div className={cn("flex flex-col gap-12", withRail && "@5xl:grid @5xl:grid-cols-[10rem_minmax(0,1fr)] @5xl:gap-12")}>
          {withRail && (
            <>
              {/* Phones and narrow columns: the sections as a strip under the header. */}
              <div className="sticky top-17.5 z-20 -mx-4 border-b bg-bg px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 @5xl:hidden">
                <RouteStrip variant="strip" sections={sections} aria-label="Catalog" />
              </div>
              <aside className="hidden @5xl:block">
                <div className="sticky top-28 flex flex-col gap-5">
                  <p className="type-kicker text-muted">Catalog</p>
                  <RouteStrip sections={sections} aria-label="Catalog" />
                </div>
              </aside>
            </>
          )}
          <div className="flex min-w-0 flex-col gap-12">
            <WindowNotice catalog={catalog} />

            {catalog.bundles.length > 0 && (
              <section aria-labelledby="category-bundles" className="flex flex-col gap-2">
                <Route className="mb-2 w-10" />
                <h2 id="category-bundles" className="scroll-mt-32 type-display-lg text-text">
                  Bundles
                </h2>
                <ul className="@container flex flex-col">
                  {catalog.bundles.map((bundle) => (
                    <BundleRow key={bundle.id} bundle={bundle} cart={cart} canOrder={canOrder} />
                  ))}
                </ul>
              </section>
            )}

            {categories.map((category) => {
              const products = catalog.products.filter((p) => p.category === category)
              return (
                <section key={category} aria-labelledby={`category-${category}`} className="flex flex-col gap-2">
                  <Route className="mb-2 w-10" />
                  <h2 id={`category-${category}`} className="scroll-mt-32 type-display-lg text-text">
                    {CATEGORY_LABELS[category]}
                  </h2>
                  {products.some((p) => p.allergens.length > 0) && (
                    <Alert variant="warning" className="my-2">
                      <AlertTitle>Check the allergens</AlertTitle>
                      <AlertDescription>
                        Allergens are listed on every product, and the kitchen handles other ingredients too. Have a serious allergy? Ask
                        us on WeChat before ordering.
                      </AlertDescription>
                    </Alert>
                  )}
                  <ul className="@container flex flex-col">
                    {products.map((product) => (
                      <ProductRow key={product.id} product={product} cart={cart} canOrder={canOrder} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      </Container>

      {/* The cart as the screen in a train: what you carry, where it goes next, and the way there. */}
      {summary.count > 0 && (
        <div className="tone-ink fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]" data-slot="cart-bar">
          <div data-line="danus" aria-hidden className="line-stripe" />
          <Container className="@container flex h-20 items-center justify-between gap-4">
            <p className="flex flex-col">
              <span className="type-kicker text-muted">
                {summary.count} {summary.count === 1 ? "item" : "items"}
              </span>
              <span className="type-heading-md text-text">{formatYuan(summary.totalFen)}</span>
            </p>
            {canOrder && (
              <p className="hidden items-baseline gap-x-5 @2xl:flex">
                <span className="flex items-baseline gap-2">
                  <span className="type-kicker text-muted">Next</span>
                  <span className="type-sign text-text">{signedIn ? "Checkout" : "Sign in"}</span>
                </span>
                {lastStop && (
                  <span className="flex items-baseline gap-2">
                    <span className="type-kicker text-muted">Towards</span>
                    <span className="type-sign text-text">{lastStop}</span>
                  </span>
                )}
              </p>
            )}
            {canOrder && (
              <Link
                href={
                  signedIn
                    ? `/${catalog.slug}/checkout`
                    : `/sign-in?next=${encodeURIComponent(`/${catalog.slug}/checkout`)}`
                }
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                {signedIn ? "Go to checkout" : "Sign in to order"}
              </Link>
            )}
          </Container>
        </div>
      )}
    </>
  )
}

function WindowNotice({ catalog }: { catalog: Catalog }) {
  if (catalog.window === "open") return null
  const online = catalog.offers.delivery || catalog.offers.pickup
  if (!online) {
    return (
      <Alert>
        <AlertTitle>Sold at the booth only</AlertTitle>
        <AlertDescription>
          See the products and prices here, then buy in person at {catalog.pickupInfo}.
        </AlertDescription>
      </Alert>
    )
  }
  if (catalog.window === "not_open") {
    const opens = catalog.onlineOpensAt ? new Date(catalog.onlineOpensAt) : null
    return (
      <Alert>
        <AlertTitle>Online ordering hasn't opened yet</AlertTitle>
        <AlertDescription>
          {opens && `Online ordering opens ${formatDate(opens)} at ${formatTime(opens)} Shenzhen time. `}
          You can already see the products and prices.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="warning">
      <AlertTitle>Online ordering has closed</AlertTitle>
      <AlertDescription>
        {catalog.offers.booth
          ? `What's left can be bought in person at ${catalog.pickupInfo}.`
          : "Thank you. Watch the PPITSZ socials for the next campaign."}
      </AlertDescription>
    </Alert>
  )
}

function ProductRow({ product, cart, canOrder }: { product: CatalogProduct; cart: Cart; canOrder: boolean }) {
  const selectId = useId()
  const hasOptions = product.variants.length > 1
  const [variantId, setVariantId] = useState(
    () => (product.variants.find((v) => v.available > 0) ?? product.variants[0])!.id
  )
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]!
  const prices = new Set(product.variants.map((v) => v.priceFen))
  const startsAt = product.onSaleFrom ? new Date(product.onSaleFrom) : null
  const endsAt = product.onSaleUntil ? new Date(product.onSaleUntil) : null
  const orderable = canOrder && !startsAt

  return (
    <Row
      anchor={`product-${product.id}`}
      imageUrl={product.imageUrl}
      info={
        <>
          <ProductTags tags={product.tags} className="mb-1" />
          <h3 className="type-heading-md text-text">{product.name}</h3>
          {product.description && (
            <p className="max-w-[66ch] type-body-sm text-muted">{product.description}</p>
          )}
          <Allergens allergens={product.allergens} />
          <p className="mt-1 type-ui text-text">{formatYuan(variant.priceFen)}</p>
          {startsAt ? (
            <Badge className="mt-1">
              From {formatDate(startsAt)}, {formatTime(startsAt)}
            </Badge>
          ) : (
            <Availability available={variant.available} remaining={variant.remaining} />
          )}
          {endsAt && (
            <p className="type-caption text-muted">
              On sale until {formatDate(endsAt)}, {formatTime(endsAt)}
            </p>
          )}
          {product.sizeChart && <SizeChartButton chart={product.sizeChart} productName={product.name} />}
        </>
      }
      controls={
        <>
          {hasOptions && (
            <div className="flex min-w-40 flex-1 flex-col gap-1.5">
              <label htmlFor={selectId} className="type-ui text-text">
                Variant
              </label>
              <NativeSelect
                id={selectId}
                size="sm"
                value={variant.id}
                onChange={(e) => setVariantId(e.target.value)}
              >
                {product.variants.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.label}
                    {prices.size > 1 ? ` · ${formatYuan(v.priceFen)}` : ""}
                    {v.available === 0 ? " · sold out" : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          <QtyControl
            cart={cart}
            choice={{ productId: product.id, variantId: variant.id }}
            label={`${product.name} ${variant.label}`.trim()}
            max={Math.min(variant.available, MAX_QTY_PER_LINE)}
            canOrder={orderable}
          />
        </>
      }
    />
  )
}

function BundleRow({ bundle, cart, canOrder }: { bundle: CatalogBundle; cart: Cart; canOrder: boolean }) {
  const idPrefix = useId()
  const [picks, setPicks] = useState(() => defaultPicks(bundle.components, (v) => v.available))
  const picked = bundle.components.map((c, i) => ({
    component: c,
    variant: c.variants.find((v) => v.id === picks[i]) ?? c.variants[0]!,
  }))
  const units = (left: "available" | "remaining") =>
    picked.map(({ component, variant }) => ({
      key: `${component.productId}/${variant.id}`,
      qty: component.qty,
      available: variant[left],
    }))
  const available = bundlesLeft(units("available"))
  const separately = picked.reduce((sum, { component, variant }) => sum + component.qty * variant.priceFen, 0)
  const contents = contentsLabel(bundle.components.map((c) => ({ name: c.name, variantLabel: "", qty: c.qty })))
  const pickedLabel = contentsLabel(
    picked.map(({ component, variant }) => ({ name: component.name, variantLabel: variant.label, qty: component.qty }))
  )

  return (
    <Row
      anchor={`bundle-${bundle.id}`}
      imageUrl={bundle.imageUrl}
      info={
        <>
          <h3 className="type-heading-md text-text">{bundle.name}</h3>
          <p className="type-body-sm text-text">Contains: {contents}</p>
          {bundle.description && (
            <p className="max-w-[66ch] type-body-sm text-muted">{bundle.description}</p>
          )}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 type-ui text-text">
            {formatYuan(bundle.priceFen)}
            {separately > bundle.priceFen && (
              <span className="type-caption text-muted">
                Save {formatYuan(separately - bundle.priceFen)} on buying separately
              </span>
            )}
          </p>
          <Availability available={available} remaining={bundlesLeft(units("remaining"))} />
          {bundle.components.map(
            (c, i) =>
              c.sizeChart &&
              bundle.components.findIndex((o) => o.productId === c.productId) === i && (
                <SizeChartButton key={c.productId} chart={c.sizeChart} productName={c.name} />
              )
          )}
        </>
      }
      controls={
        <>
          <BundlePicks
            idPrefix={idPrefix}
            components={bundle.components}
            picks={picks}
            onChange={setPicks}
            leftOf={(v) => v.available}
          />
          <QtyControl
            cart={cart}
            choice={{ bundleId: bundle.id, picks }}
            label={`${bundle.name}: ${pickedLabel}`}
            max={Math.min(available, MAX_QTY_PER_LINE)}
            canOrder={canOrder}
          />
        </>
      }
    />
  )
}

/** `anchor` is the row's id, so the homepage can link straight to a product or bundle. */
function Row({
  anchor,
  imageUrl,
  info,
  controls,
}: {
  anchor: string
  imageUrl?: string
  info: React.ReactNode
  controls: React.ReactNode
}) {
  return (
    <li
      id={anchor}
      className="grid scroll-mt-24 gap-4 border-t py-6 @xl:grid-cols-[7rem_1fr_auto] @xl:items-start @xl:gap-6"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by /media, already sized
        <img src={imageUrl} alt="" className="aspect-square w-28 rounded-xl bg-surface object-cover" />
      ) : (
        <span aria-hidden className="hidden aspect-square w-28 rounded-xl bg-surface @xl:block" />
      )}
      <div className="flex min-w-0 flex-col gap-1">{info}</div>
      <div className="flex flex-wrap items-end gap-3 @xl:w-64 @xl:flex-col @xl:items-stretch">{controls}</div>
    </li>
  )
}

/** "Add", then − n + once the choice is in the cart. */
function QtyControl({
  cart,
  choice,
  label,
  max,
  canOrder,
}: {
  cart: Cart
  choice: CartChoice
  /** What is being added, for screen readers. */
  label: string
  max: number
  canOrder: boolean
}) {
  const qty = cart.qtyOf(choice)
  if (qty === 0) {
    return (
      <Button size="sm" disabled={!canOrder || max === 0} onClick={() => cart.setQty(choice, 1)}>
        <PlusIcon aria-hidden weight="bold" />
        Add
        <span className="sr-only"> {label}</span>
      </Button>
    )
  }
  return (
    <div role="group" aria-label={`Quantity of ${label}`} className="flex items-center gap-2">
      <Button size="icon-sm" aria-label="Kurangi" onClick={() => cart.setQty(choice, qty - 1)}>
        <MinusIcon aria-hidden weight="bold" />
      </Button>
      <output aria-live="polite" className="min-w-8 text-center type-heading-sm text-text">
        {qty}
      </output>
      <Button
        size="icon-sm"
        aria-label="Add one"
        disabled={qty >= max}
        onClick={() => cart.setQty(choice, qty + 1)}
      >
        <PlusIcon aria-hidden weight="bold" />
      </Button>
    </div>
  )
}

function Availability({ available, remaining }: { available: number; remaining: number }) {
  // Without a booth, available and remaining are the same.
  if (available === 0 && remaining > 0) {
    return <Badge className="mt-1">Booth only</Badge>
  }
  if (available === 0) {
    return (
      <Badge variant="neutral" className="mt-1">
        Sold out
      </Badge>
    )
  }
  if (available <= 5) {
    return <p className="type-caption text-warning-text">{available} left</p>
  }
  return null
}
