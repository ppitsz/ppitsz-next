import NextLink from "next/link"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Route } from "@ppitsz/ui/components/network/route"
import { Link } from "@ppitsz/ui/components/link"
import { ordersSummary } from "@/lib/domain/account"
import type { BuyerProfile, Campaign, Order } from "@/lib/domain/types"
import { OrderCard } from "@/components/order-card"

/** On the homepage, at most this many active orders; the rest are in Your orders. */
const SHOWN = 4

/**
 * "Hi, Budi." and the buyer's active orders with their progress. Signed
 * out: an invitation to sign in, since ordering needs an account.
 */
export function YourOrders({
  buyer,
  active,
  doneCount,
  campaigns,
}: {
  buyer: BuyerProfile | null
  active: Order[]
  doneCount: number
  campaigns: Map<string, Campaign>
}) {
  if (!buyer) {
    return (
      <section aria-labelledby="your-orders" className="bg-surface">
        <Container className="flex flex-col gap-6 py-12">
          <div className="flex flex-col gap-3">
            <Route data-line="danus" className="w-10" />
            <p className="type-kicker text-accent-text">Your orders</p>
            <h2 id="your-orders" className="type-display-lg text-text">
              Track your orders from any phone.
            </h2>
            <p className="max-w-[60ch] type-body text-muted">
              Sign in to order. Every order, from payment to delivery or pickup, shows in your account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <NextLink href="/sign-in" className={buttonVariants()}>
              Sign in
            </NextLink>
            <NextLink href="/sign-up" className={buttonVariants({ variant: "quiet" })}>
              Create an account
            </NextLink>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section aria-labelledby="your-orders" className="bg-surface">
      <Container className="@container flex flex-col gap-8 py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <Route data-line="danus" className="w-10" />
            <p className="type-kicker text-accent-text">Your orders</p>
            <h2 id="your-orders" className="type-display-lg text-text">
              Hi, {buyer.name.split(" ")[0] || "there"}.
            </h2>
            <p className="type-body text-muted">{ordersSummary(active)}</p>
          </div>
          {(active.length > 0 || doneCount > 0) && (
            <Link as={NextLink} href="/orders" variant="standalone">
              All orders ({active.length + doneCount})
            </Link>
          )}
        </div>
        {active.length > 0 && (
          <ul className="grid gap-4 @4xl:grid-cols-2">
            {active.slice(0, SHOWN).map((order) => (
              <li key={order.id}>
                <OrderCard order={order} campaign={campaigns.get(order.campaignId)} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
