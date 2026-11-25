import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requireStaff } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { listCampaigns } from "@/lib/store"
import { CampaignForm } from "@/components/staff/campaign-form"

export const metadata: Metadata = { title: "Create campaign" }

/** A new campaign starts as a draft; it can start with another campaign's payment accounts. */
export default async function NewCampaignPage() {
  await requireStaff("admin")
  const campaigns = await listCampaigns()
  const nextSort = campaigns.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1

  return (
    <Container narrow className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        {campaigns.length > 0 && (
          <Link as={NextLink} href="/staff/settings" variant="standalone" className="self-start">
            Settings
          </Link>
        )}
        <p className="type-kicker text-accent-text">New campaign</p>
        <h1 className="type-display-xl text-text">Create campaign</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          It starts as a draft: buyers don't see it until its status is Open. Once it's created, add
          its products.
        </p>
      </div>
      <CampaignForm
        host={(await siteOrigin()).replace(/^https?:\/\//, "")}
        campaignId={null}
        copySources={campaigns.filter((c) => c.paymentAccounts.length > 0).map(({ id, name }) => ({ id, name }))}
        values={{
          name: "",
          slug: "",
          codePrefix: "",
          tagline: "",
          featuredProductId: "",
          sortOrder: nextSort,
          status: "draft",
          boothInfo: "",
          pickupPoints: [],
          onlineOpensAt: "",
          onlineClosesAt: "",
          offers: { delivery: true, pickup: true, booth: false },
          deliveryFee: "0",
          deliverySlots: [],
          paymentWindowMinutes: 120,
          accounts: [],
        }}
      />
    </Container>
  )
}
