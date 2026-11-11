import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"
import { Timetable } from "@ppitsz/ui/components/blocks/timetable"
import { StationNameplate } from "@ppitsz/ui/components/network/station-nameplate"
import { Route, RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { campaignRoute } from "@/lib/domain/order"
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

  // The nameplate spans the content column, the same edges as the catalog
  // below. The description is part of the sign: what this campaign is, kept
  // apart from how ordering works.
  const nameplate = (
    <StationNameplate
      kicker="Danus PPIT Shenzhen"
      name={campaign.name}
      line="danus"
      lines={["danus"]}
      linkAs={NextLink}
      previous={{ label: "All campaigns", href: "/" }}
      next={campaign.status === "closed" ? undefined : { label: "Checkout" }}
    >
      {campaign.tagline && <p className="max-w-[60ch] type-lede text-text">{campaign.tagline}</p>}
    </StationNameplate>
  )

  if (campaign.status === "closed") {
    return (
      <Container className="flex flex-col gap-8 pt-10 pb-16 lg:pt-16">
        {nameplate}
        <ServiceNotice kind="ended" lines={["danus"]} title="This campaign has ended">
          <p>
            Thank you for supporting Danus. You can still open your orders from{" "}
            <NextLink href="/orders">Your orders</NextLink> in your account.
          </p>
        </ServiceNotice>
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
  const route = campaignRoute(campaign.offers)
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
        {nameplate}

        {/* Two columns from @4xl: how ordering works, with its times beside it. */}
        <section aria-labelledby="how-to-order" className="@container">
          <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:gap-12">
            <div className="flex min-w-0 flex-col gap-4">
              <Route data-line="danus" className="w-10" />
              <h2 id="how-to-order" className="type-heading-md text-text">
                How to order
              </h2>
              <p className="max-w-[66ch] type-body text-muted">
                {orderingNote(campaign, now)}. {fulfillmentNote(campaign)}
              </p>
              {(delivery || pickup) && (
                <div data-line="danus" className="@container/route pt-2">
                  <RouteList orientation="vertical" className="@xl/route:hidden">
                    {route.map((label, i) => (
                      <RouteStop key={label} state="upcoming">
                        <span className="type-sign text-text">{label}</span>
                        <span className="type-caption text-muted">{routeNotes[i]}</span>
                      </RouteStop>
                    ))}
                  </RouteList>
                  <RouteList orientation="horizontal" className="hidden @xl/route:flex">
                    {route.map((label, i) => (
                      <RouteStop key={label} state="upcoming">
                        <span className="type-sign text-text">{label}</span>
                        <span className="type-caption text-muted">{routeNotes[i]}</span>
                      </RouteStop>
                    ))}
                  </RouteList>
                </div>
              )}
            </div>
            {(delivery || pickup) && (campaign.onlineOpensAt || campaign.onlineClosesAt) && (
              <Timetable
                title="Ordering online"
                line="danus"
                headingLevel="h3"
                rows={[
                  { label: "First order", at: campaign.onlineOpensAt, none: "Open now" },
                  { label: "Last order", at: campaign.onlineClosesAt, none: "No cutoff" },
                ]}
              />
            )}
          </div>
        </section>
      </Container>

      <Shop catalog={catalog} signedIn={!!buyer} />
    </>
  )
}
