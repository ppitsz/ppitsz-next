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
import { campaignHasOrders, listCampaigns, listProducts } from "@/lib/store"
import { CampaignForm, type CampaignFormValues } from "@/components/staff/campaign-form"
import { CampaignSwitcher } from "@/components/staff/campaign-switcher"
import { TestAlertButton } from "@/components/staff/test-alert-button"

export const metadata: Metadata = { title: "Settings" }

/** The picked campaign's settings. With no campaign yet, the new-campaign page. */
export default async function SettingsPage() {
  await requireStaff("admin")
  const campaigns = await listCampaigns()
  const campaign = await pickedCampaign(campaigns)
  if (!campaign) redirect("/staff/settings/new")
  const [locked, products] = await Promise.all([
    campaignHasOrders(campaign.id),
    listProducts(campaign.id, { includeInactive: true }),
  ])

  const values: CampaignFormValues = {
    name: campaign.name,
    slug: campaign.slug,
    codePrefix: campaign.codePrefix,
    tagline: campaign.tagline,
    coverImageUrl: campaign.coverImagePath ? mediaUrl(campaign.coverImagePath) : undefined,
    featuredProductId: campaign.featuredProductId ?? "",
    sortOrder: campaign.sortOrder,
    status: campaign.status,
    pickupInfo: campaign.pickupInfo,
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
          <NextLink href="/staff/settings/new" className={buttonVariants()}>
            Create new campaign
          </NextLink>
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
