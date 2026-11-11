import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"

import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { Link } from "@ppitsz/ui/components/link"
import { accountOrigin } from "@ppitsz/accounts/urls"
import { buyerSignOutAction } from "@/lib/actions/buyer"
import { splitOrders } from "@/lib/domain/account"
import { requireBuyer } from "@/lib/server/auth"
import { listBuyerOrders, listCampaigns } from "@/lib/store"
import { JourneyLog } from "@/components/journey-log"
import { OrderCard } from "@/components/order-card"
import { TabLink } from "@/components/tab-link"

export const metadata: Metadata = { title: "Your orders", robots: { index: false } }

/**
 * The account's orders: Active (still moving) as cards, or Done as a journey
 * log, with the tabs as links so the tab survives a reload.
 */
export default async function MyOrdersPage({ searchParams }: PageProps<"/orders">) {
  await connection()
  const buyer = await requireBuyer("/orders")
  const { tab } = await searchParams
  const showDone = tab === "done"
  const [orders, campaigns] = await Promise.all([listBuyerOrders(buyer.uid), listCampaigns()])
  const { active, done } = splitOrders(orders)
  const shown = showDone ? done : active
  const byId = new Map(campaigns.map((c) => [c.id, c]))

  return (
    <Container className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="type-kicker text-accent-text">{buyer.name || buyer.email}</p>
          <h1 className="type-display-xl text-text">Your orders</h1>
        </div>
        <nav aria-label="Orders" className="flex gap-2">
          <TabLink href="/orders" current={!showDone}>
            Active ({active.length})
          </TabLink>
          <TabLink href="/orders?tab=done" current={showDone}>
            Done ({done.length})
          </TabLink>
        </nav>
      </div>

      <div className="@container">
      {shown.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{showDone ? "No arrivals yet." : "No departures yet."}</EmptyTitle>
            <EmptyDescription>
              {showDone ? "Orders you have picked up or received show here. " : "Orders you place show here. "}
              <NextLink href="/">See Danus campaigns</NextLink>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : showDone ? (
        <JourneyLog orders={done} campaigns={byId} />
      ) : (
        <ul className="grid gap-4 @4xl:grid-cols-2">
          {shown.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} campaign={byId.get(order.campaignId)} />
            </li>
          ))}
        </ul>
      )}
      </div>

      <section aria-labelledby="your-account" className="flex flex-col items-start gap-4 border-t pt-8">
        <h2 id="your-account" className="type-heading-lg text-text">
          Your account
        </h2>
        <p className="max-w-[66ch] type-body text-muted">
          Signed in as {buyer.email}. Your name, WeChat ID, phone and password are on your{" "}
          <Link href={accountOrigin()}>PPITSZ account</Link>, the same one for every PPIT Shenzhen app.
        </p>
        <form action={buyerSignOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </section>
    </Container>
  )
}
