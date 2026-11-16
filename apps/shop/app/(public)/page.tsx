import NextLink from "next/link"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { Route } from "@ppitsz/ui/components/network/route"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { toCatalog } from "@/lib/catalog"
import { splitOrders } from "@/lib/domain/account"
import { bySlotTime } from "@/lib/domain/delivery"
import { featuredOf, showcaseFilters, showcaseOf } from "@/lib/home"
import { getBuyer, getStaff } from "@/lib/server/auth"
import { listBundles, listBuyerOrders, listCampaigns, listProducts, slotPlaces } from "@/lib/store"
import { Hero } from "@/components/home/hero"
import { CampaignBoard } from "@/components/home/campaign-board"
import { HowTo } from "@/components/home/how-to"
import { Showcase } from "@/components/home/showcase"
import { YourOrders } from "@/components/home/your-orders"

/** How many upcoming delivery slots the how-to band lists. */
const SLOTS_SHOWN = 3

/**
 * The shop's front: the first open campaign as a hero, the buyer's orders,
 * what every open campaign sells, and how ordering works. Buying itself
 * happens on each campaign's page.
 */
export default async function HomePage() {
  await connection()
  const now = new Date()
  const [campaigns, buyer, staff] = await Promise.all([listCampaigns(), getBuyer(), getStaff()])
  const open = campaigns.filter((c) => c.status === "open")
  // Only staff can open a draft, to look at it and place test orders.
  const drafts = staff ? campaigns.filter((c) => c.status === "draft") : []

  const [orders, sales] = await Promise.all([
    buyer ? listBuyerOrders(buyer.uid, now) : Promise.resolve([]),
    Promise.all(
      open.map(async (campaign) => {
        const [products, bundles, places] = await Promise.all([
          listProducts(campaign.id, { includeInactive: true, now }),
          listBundles(campaign.id),
          slotPlaces(campaign, now),
        ])
        const catalog = toCatalog(campaign, products, bundles, { now, slotPlaces: places })
        const items = showcaseOf(catalog, products)
        return { campaign, catalog, bundles, items }
      })
    ),
  ])
  const { active, done } = splitOrders(orders)
  const items = sales.flatMap((s) => s.items)
  const [lead, ...others] = sales
  const collecting = open.filter((c) => c.offers.pickup && c.pickupInfo)
  const slots = bySlotTime(open.filter((c) => c.offers.delivery).flatMap((c) => c.deliverySlots))
    .filter((s) => s.startsAt > now)
    .slice(0, SLOTS_SHOWN)

  return (
    <>
      {lead ? (
        <Hero campaign={lead.campaign} featured={featuredOf(lead.campaign, lead.catalog, lead.items, lead.bundles)} now={now} />
      ) : (
        <section className="tone-ink">
          <Container data-line="danus" className="flex flex-col gap-4 py-16 lg:py-24">
            <span aria-hidden className="route mb-6" />
            <p className="type-kicker text-muted">PPIT Shenzhen</p>
            <h1 className="type-display-2xl text-text">PPITSZ Shop</h1>
            <p className="type-heading-lg text-text">No departures scheduled.</p>
            <p className="max-w-[56ch] type-lede text-muted">
              No campaigns are open. Watch the PPITSZ socials for the next one.
            </p>
          </Container>
        </section>
      )}

      {drafts.length > 0 && (
        <Container className="pt-10">
          <Alert variant="warning">
            <AlertTitle>Drafts</AlertTitle>
            <AlertDescription>
              Only staff see these. Open one to check it and place test orders:{" "}
              {drafts.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <NextLink href={`/${c.slug}`}>{c.name}</NextLink>
                </span>
              ))}
              .
            </AlertDescription>
          </Alert>
        </Container>
      )}

      <YourOrders
        buyer={buyer}
        active={active}
        doneCount={done.length}
        campaigns={new Map(campaigns.map((c) => [c.id, c]))}
      />

      {others.length > 0 && (
        <Container className="flex flex-col gap-6 pt-12 lg:pt-16">
          <div className="flex flex-col gap-3">
            <Route data-line="danus" className="w-10" />
            <p className="type-kicker text-accent-text">Departures</p>
            <h2 className="type-display-lg text-text">Every open campaign.</h2>
            <p className="max-w-[60ch] type-body text-muted">Soonest to close first. Times are Shenzhen time.</p>
          </div>
          <CampaignBoard campaigns={open} now={now} />
        </Container>
      )}

      {open.length > 0 && (
        <Container className="flex flex-col gap-8 py-12 lg:py-16">
          <div className="flex flex-col gap-3">
            <Route data-line="danus" className="w-10" />
            <p className="type-kicker text-accent-text">In the shop now</p>
            <h2 className="type-display-lg text-text">On sale now.</h2>
          </div>
          {items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Products are coming soon.</EmptyTitle>
                <EmptyDescription>Check again later, or open the campaign's page.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Showcase items={items} filters={showcaseFilters(items)} showCampaign={open.length > 1} />
          )}
        </Container>
      )}

      <HowTo
        offers={{
          delivery: open.some((c) => c.offers.delivery),
          pickup: open.length === 0 || open.some((c) => c.offers.pickup),
        }}
        pickupPlaces={[...new Set(collecting.map((c) => c.pickupInfo))]}
        slots={slots}
      />
    </>
  )
}
