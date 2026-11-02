import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { Link } from "@ppitsz/ui/components/link"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { DELIVERY_ROUTE, ORDER_ROUTE } from "@/lib/domain/order"
import { fulfillmentNote, orderingNote } from "@/lib/campaign-copy"
import { toCatalog } from "@/lib/catalog"
import { getBuyer } from "@/lib/server/auth"
import { visibleCampaign } from "@/lib/server/buyer-campaign"
import { listBundles, listProducts, slotPlaces } from "@/lib/store"
import { Shop } from "@/components/shop"

const ROUTE_NOTES = ["Choose products and fill in your name", "Transfer, then upload the proof", "Danus checks the payment"]
const LAST_NOTE = {
  delivery: "Delivered in the slot you choose",
  pickup: "Show your QR code at pickup",
  both: "Delivered, or show your QR code at pickup",
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const campaign = await visibleCampaign((await params).slug)
  return campaign ? { title: campaign.name, description: campaign.tagline || undefined } : {}
}

/** One campaign's catalog. A draft is a staff preview; a closed campaign has no catalog left. */
export default async function CatalogPage({ params }: PageProps<"/[slug]">) {
  await connection()
  const campaign = await visibleCampaign((await params).slug)
  if (!campaign) notFound()

  const header = (
    <div className="flex max-w-[56rem] flex-col gap-4">
      <Link as={NextLink} href="/" variant="standalone" className="self-start">
        All campaigns
      </Link>
      <p className="type-kicker text-accent-text">Danus PPIT Shenzhen</p>
      <h1 className="type-display-xl text-text">{campaign.name}</h1>
      {campaign.tagline && <p className="max-w-[66ch] type-lede text-muted">{campaign.tagline}</p>}
    </div>
  )

  if (campaign.status === "closed") {
    return (
      <Container className="flex flex-col gap-10 pt-10 pb-16 lg:pt-16">
        {header}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>This campaign has ended.</EmptyTitle>
            <EmptyDescription>
              Thank you for supporting Danus. You can still open your orders from{" "}
              <NextLink href="/orders">Your orders</NextLink> in your account.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Container>
    )
  }

  const now = new Date()
  const [products, bundles, places, buyer] = await Promise.all([
    listProducts(campaign.id, { includeInactive: true, now }),
    listBundles(campaign.id),
    slotPlaces(campaign, now),
    getBuyer(),
  ])
  const catalog = toCatalog(campaign, products, bundles, { now, slotPlaces: places })
  const { delivery, pickup } = campaign.offers
  // The last stop: Delivery, Pick up, or Receive when the buyer picks at checkout.
  const route = delivery && pickup ? [...ORDER_ROUTE.slice(0, 3), "Receive"] : delivery ? DELIVERY_ROUTE : ORDER_ROUTE
  const routeNotes = [...ROUTE_NOTES, LAST_NOTE[delivery && pickup ? "both" : delivery ? "delivery" : "pickup"]]

  return (
    <>
      <Container className="flex flex-col gap-8 pt-10 pb-12 lg:pt-16">
        {campaign.status === "draft" && (
          <Alert variant="warning">
            <AlertTitle>Staff preview</AlertTitle>
            <AlertDescription>
              This campaign is still a draft: buyers can't see it yet. Open it in Settings.
            </AlertDescription>
          </Alert>
        )}
        {header}
        <p className="-mt-4 max-w-[66ch] type-body text-muted">
          {orderingNote(campaign, now)}
          {campaign.onlineClosesAt || campaign.onlineOpensAt ? " Shenzhen time" : ""}. {fulfillmentNote(campaign)}
        </p>

        {(delivery || pickup) && (
        <div data-line="danus" className="max-w-[56rem]">
          <h2 className="sr-only">Cara memesan</h2>
          <RouteList orientation="vertical" className="sm:hidden">
            {route.map((label, i) => (
              <RouteStop key={label} state="upcoming">
                <span className="type-sign text-text">{label}</span>
                <span className="type-caption text-muted">{routeNotes[i]}</span>
              </RouteStop>
            ))}
          </RouteList>
          <RouteList orientation="horizontal" className="hidden sm:flex">
            {route.map((label, i) => (
              <RouteStop key={label} state="upcoming">
                <span className="type-sign text-text">{label}</span>
                <span className="type-caption text-muted">{routeNotes[i]}</span>
              </RouteStop>
            ))}
          </RouteList>
        </div>
        )}
      </Container>

      <Shop catalog={catalog} signedIn={!!buyer} />
    </>
  )
}
