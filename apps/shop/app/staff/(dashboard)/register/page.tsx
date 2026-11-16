import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { requireStaff } from "@/lib/server/auth"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { toCatalog } from "@/lib/catalog"
import { listBundles, listCampaigns, listProducts } from "@/lib/store"
import { CampaignSwitcher } from "@/components/staff/campaign-switcher"
import { Register } from "@/components/staff/register"

export const metadata: Metadata = { title: "Register" }

/** Walk-in sales for one open campaign with a booth at a time; a buyer of two campaigns gets two sales. */
export default async function RegisterPage() {
  const staff = await requireStaff()
  const open = (await listCampaigns()).filter((c) => c.status === "open" && c.offers.booth)
  const campaign = await pickedCampaign(open)
  // Inactive products too: a bundle may hold one that is not sold on its own.
  const [products, bundles] = campaign
    ? await Promise.all([listProducts(campaign.id, { includeInactive: true }), listBundles(campaign.id)])
    : [[], []]
  const catalog = campaign ? toCatalog(campaign, products, bundles) : { products: [], bundles: [] }
  // Upcoming products are in the catalog for buyers to see; the register can't sell them yet.
  const forRegister = { ...catalog, products: catalog.products.filter((p) => !p.onSaleFrom) }

  return (
    <Container className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-3">
        {campaign ? (
          <CampaignSwitcher campaigns={open} currentId={campaign.id} />
        ) : (
          <p className="type-kicker text-accent-text">Walk-in sales at the booth</p>
        )}
        <h1 className="type-display-lg text-text">Register</h1>
      </div>
      {forRegister.products.length === 0 && forRegister.bundles.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{campaign ? "No products for sale yet." : "No open campaign has a booth."}</EmptyTitle>
            <EmptyDescription>
              {staff.role === "admin" ? (
                <NextLink href={campaign ? "/staff/products" : "/staff/settings"}>
                  {campaign ? "Add products" : "Set up a booth in Settings"}
                </NextLink>
              ) : (
                "Ask a shop admin to add the products."
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Register
          key={campaign!.id}
          campaignId={campaign!.id}
          products={forRegister.products}
          bundles={forRegister.bundles}
          accounts={campaign!.paymentAccounts.map(({ id, method, holder }) => ({ id, method, holder }))}
        />
      )}
    </Container>
  )
}
