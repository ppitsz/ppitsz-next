import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardKicker, CardTitle } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { formatYuan } from "@ppitsz/ui/lib/format"
import { requireStaff } from "@/lib/server/auth"
import type { Campaign, Order } from "@/lib/domain/types"
import { listAwaitingVerification, listCampaigns } from "@/lib/store"
import { ItemList, paymentDestination, ProofImage, when } from "@/components/staff/order-bits"
import { ReviewActions } from "@/components/staff/order-actions"

export const metadata: Metadata = { title: "Verify payments" }

export default async function VerificationPage() {
  await requireStaff("admin")
  // One queue for every campaign: each card names its own.
  const [orders, campaigns] = await Promise.all([listAwaitingVerification(), listCampaigns()])
  const campaignOf = new Map(campaigns.map((c) => [c.id, c]))

  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">All campaigns</p>
        <h1 className="type-display-xl text-text">Verify payments</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          Match each proof against the receiving account's statement: the amount, the time and the order code in
          the transfer note. The longest waiting is at the top.
        </p>
      </div>

      {orders.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No proofs to check.</EmptyTitle>
            <EmptyDescription>
              New proofs show up here as soon as buyers send them. <Link href="/staff/orders">See all orders</Link>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-6">
          {orders.flatMap((order) => {
            const campaign = campaignOf.get(order.campaignId)
            return campaign
              ? [
                  <li key={order.id}>
                    <ReviewCard order={order} campaign={campaign} />
                  </li>,
                ]
              : []
          })}
        </ul>
      )}
    </Container>
  )
}

function ReviewCard({ order, campaign }: { order: Order; campaign: Campaign }) {
  const destination = paymentDestination(order, campaign)
  return (
    <Card variant="outline">
      <CardHeader>
        <CardKicker>
          {campaign.name} · sent {order.payment.submittedAt && when(order.payment.submittedAt)}
        </CardKicker>
        <CardTitle>
          <Link href={`/staff/orders/${order.id}`} className="underline-offset-4 hover:underline">
            {order.code}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="@container">
        <div className="grid gap-6 @3xl:grid-cols-[minmax(0,22rem)_1fr]">
          <ProofImage order={order} />
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 rounded-xl bg-surface p-4">
              <span className="type-caption text-muted">Due</span>
              <span className="type-heading-lg text-text">{formatYuan(order.totalFen)}</span>
              {destination && <span className="type-body-sm text-text">to {destination}</span>}
              <span className="type-body-sm text-muted">
                The transfer note should say <strong className="text-text">{order.code}</strong>
              </span>
            </div>
            {order.buyer && (
              <p className="type-body-sm text-text">
                {order.buyer.name} · WeChat {order.buyer.wechatId}
                {order.buyer.phone && ` · ${order.buyer.phone}`}
              </p>
            )}
            <ItemList order={order} />
            <ReviewActions orderId={order.id} code={order.code} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
