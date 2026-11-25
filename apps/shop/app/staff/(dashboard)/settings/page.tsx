import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { requireStaff } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { mediaUrl } from "@/lib/catalog"
import { toShenzhenInput } from "@/lib/shenzhen-time"
import { campaignHasOrders, countTestOrders, listCampaigns, listProducts } from "@/lib/store"
import { CampaignForm, type CampaignFormValues } from "@/components/staff/campaign-form"
import { CampaignSwitcher } from "@/components/staff/campaign-switcher"
import { DeleteCampaignButton } from "@/components/staff/delete-campaign-button"
import { DeleteTestOrdersButton } from "@/components/staff/delete-test-orders-button"
import { TestAlertButton } from "@/components/staff/test-alert-button"

export const metadata: Metadata = { title: "Settings" }

/** The picked campaign's settings. With no campaign yet, the new-campaign page. */
export default async function SettingsPage() {
  await requireStaff("admin")
  const campaigns = await listCampaigns()
  const campaign = await pickedCampaign(campaigns)
  if (!campaign) redirect("/staff/settings/new")
  const [locked, products, testOrders] = await Promise.all([
    campaignHasOrders(campaign.id),
    listProducts(campaign.id, { includeInactive: true }),
    countTestOrders(campaign.id),
  ])
  const draft = campaign.status === "draft"

  const values: CampaignFormValues = {
    name: campaign.name,
    slug: campaign.slug,
    codePrefix: campaign.codePrefix,
    tagline: campaign.tagline,
    coverImageUrl: campaign.coverImagePath ? mediaUrl(campaign.coverImagePath) : undefined,
    featuredProductId: campaign.featuredProductId ?? "",
    sortOrder: campaign.sortOrder,
    status: campaign.status,
    boothInfo: campaign.boothInfo,
    pickupPoints: campaign.pickupPoints.map((p) => {
      const starts = toShenzhenInput(p.startsAt)
      return { id: p.id, place: p.place, date: starts.slice(0, 10), from: starts.slice(11), to: toShenzhenInput(p.endsAt).slice(11) }
    }),
    onlineOpensAt: campaign.onlineOpensAt ? toShenzhenInput(campaign.onlineOpensAt) : "",
    onlineClosesAt: campaign.onlineClosesAt ? toShenzhenInput(campaign.onlineClosesAt) : "",
    offers: campaign.offers,
    deliveryFee: String(campaign.deliveryFeeFen / 100),
    deliverySlots: campaign.deliverySlots.map((s) => {
      const starts = toShenzhenInput(s.startsAt)
      return {
        id: s.id,
        date: starts.slice(0, 10),
        from: starts.slice(11),
        to: toShenzhenInput(s.endsAt).slice(11),
        maxOrders: s.maxOrders === null ? "" : String(s.maxOrders),
      }
    }),
    paymentWindowMinutes: campaign.paymentWindowMinutes,
    accounts: campaign.paymentAccounts.map((a) => ({
      id: a.id,
      method: a.method,
      holder: a.holder,
      detail: a.detail,
      qrImageUrl: a.qrImagePath ? mediaUrl(a.qrImagePath) : undefined,
    })),
  }

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <CampaignSwitcher campaigns={campaigns} currentId={campaign.id} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="type-display-xl text-text">Settings</h1>
          <div className="flex flex-wrap gap-2">
            <NextLink href={`/${campaign.slug}`} className={buttonVariants()}>
              {draft ? "Open draft" : "Open catalog"}
            </NextLink>
            <NextLink href="/staff/settings/new" className={buttonVariants()}>
              Create new campaign
            </NextLink>
          </div>
        </div>
        <p className="max-w-[66ch] type-lede text-muted">
          URL name, status, ways of selling, delivery slots, pickup place and payment accounts. Changes show
          to buyers right away.
        </p>
      </div>
      {campaign.paymentAccounts.length === 0 && (
        <Alert variant="warning">
          <AlertTitle>No payment accounts</AlertTitle>
          <AlertDescription>Buyers can't pay for online orders until there's a payment account.</AlertDescription>
        </Alert>
      )}
      {/* Keyed by its values: after a save, the form starts over from what was stored. */}
      <CampaignForm
        host={(await siteOrigin()).replace(/^https?:\/\//, "")}
        key={JSON.stringify(values)}
        campaignId={campaign.id}
        values={values}
        locked={locked}
        products={products.map(({ id, name }) => ({ id, name }))}
      />

      {(draft || testOrders > 0) && (
        <section aria-labelledby="test-orders" className="flex flex-col items-start gap-3 border-t pt-8">
          <h2 id="test-orders" className="type-heading-lg text-text">
            Test orders
          </h2>
          <p className="max-w-[66ch] type-body-sm text-muted">
            While a campaign is a draft, staff can <NextLink href={`/${campaign.slug}`}>open it</NextLink> and order
            as a buyer would. Those orders are test orders: they take stock and can be paid, verified, scanned and
            delivered. Delete them before you change the status from Draft.
          </p>
          <p className="type-body-sm text-text">
            {testOrders === 0
              ? "No test orders."
              : testOrders === 1
                ? "1 test order."
                : `${testOrders} test orders.`}{" "}
            <NextLink href={`/staff/orders?campaign=${campaign.id}`}>See orders</NextLink>
          </p>
          <DeleteTestOrdersButton campaignId={campaign.id} count={testOrders} />
        </section>
      )}

      <section aria-labelledby="delete-campaign" className="flex flex-col items-start gap-3 border-t pt-8">
        <h2 id="delete-campaign" className="type-heading-lg text-text">
          Delete campaign
        </h2>
        {locked && testOrders > 0 ? (
          <p className="max-w-[66ch] type-body-sm text-muted">
            This campaign has test orders. Delete them above first.
          </p>
        ) : locked ? (
          <p className="max-w-[66ch] type-body-sm text-muted">
            This campaign has orders, so it can't be deleted. Set its status to Ended to take it off the
            main page.
          </p>
        ) : (
          <>
            <p className="max-w-[66ch] type-body-sm text-muted">
              Only for a campaign without orders, such as a test. Its products and bundles are deleted too.
            </p>
            <DeleteCampaignButton campaignId={campaign.id} name={campaign.name} />
          </>
        )}
      </section>

      <section aria-labelledby="alerts" className="flex flex-col gap-3 border-t pt-8">
        <h2 id="alerts" className="type-heading-lg text-text">
          Error alerts
        </h2>
        <p className="max-w-[66ch] type-body-sm text-muted">
          {process.env.ALERT_WEBHOOK_URL
            ? "On. Server errors go to the IT chat group through a webhook. Send a test to make sure it arrives."
            : "Off. Set ALERT_WEBHOOK_URL in Vercel (see the README) to send server errors to the IT chat group."}
        </p>
        {process.env.ALERT_WEBHOOK_URL && <TestAlertButton />}
      </section>
    </Container>
  )
}
