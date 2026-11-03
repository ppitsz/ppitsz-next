import type { Metadata } from "next"
import { connection } from "next/server"
import NextLink from "next/link"
import { notFound } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import {
  Ticket,
  TicketBody,
  TicketCode,
  TicketField,
  TicketFields,
  TicketHeader,
  TicketStub,
  TicketTitle,
} from "@ppitsz/ui/components/blocks/ticket"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { StationNameplate } from "@ppitsz/ui/components/network/station-nameplate"
import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { formatDate, formatTime, formatYuan } from "@ppitsz/ui/lib/format"
import { mediaUrl, PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { slotLabel } from "@/lib/campaign-copy"
import { displayStatus } from "@/lib/domain/delivery"
import {
  DELIVERY_ROUTE,
  isOpenStatus,
  openRejection,
  ORDER_ROUTE,
  orderVersion,
  routeStage,
} from "@/lib/domain/order"
import type { Campaign, Order } from "@/lib/domain/types"
import { orderPath } from "@/lib/order-path"
import { siteOrigin } from "@/lib/server/site-url"
import { getCampaign, getOrderByToken } from "@/lib/store"
import { OrderQr } from "@/components/order-qr"
import { OrderWatcher } from "@/components/order-watcher"
import { ProofForm } from "@/components/proof-form"
import { AfterCheckout } from "@/components/after-checkout"

// The URL is the buyer's only key: keep it out of search engines and referrers.
export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

const HEADINGS: Record<ReturnType<typeof displayStatus>, string> = {
  pending_payment: "Finish your payment",
  awaiting_verification: "Checking your payment",
  paid: "Ready to pick up",
  picked_up: "Picked up",
  expired: "Order expired",
  cancelled: "Order canceled",
  sending: "On its way",
  delivered: "Delivered",
}

const when = (date: Date) => `${formatDate(date)}, ${formatTime(date)}`

/** A pickup ticket this new comes out of the machine when it appears. */
const FRESH_TICKET_MS = 15 * 60 * 1000

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[token]">) {
  await connection()
  const { token } = await params
  const { new: isNew } = await searchParams
  const order = await getOrderByToken(token)
  if (!order) notFound()
  const campaign = await getCampaign(order.campaignId)
  if (!campaign) notFound()

  const stage = routeStage(order.status)
  const status = displayStatus(order)
  const heading = order.delivery && status === "paid" ? "Waiting for delivery" : HEADINGS[status]

  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      {isNew === "1" && <AfterCheckout campaignId={order.campaignId} />}
      <OrderWatcher token={order.token} version={orderVersion(order)} active={isOpenStatus(order.status)} />

      <StationNameplate
        kicker={campaign.name}
        name={heading}
        line="danus"
        lines={["danus"]}
        linkAs={NextLink}
        previous={{ label: campaign.name, href: `/${campaign.slug}` }}
      >
        <p className="flex items-center gap-3">
          <span className="type-kicker text-muted">Order</span>
          <StationCode code={order.code} line="danus" />
        </p>
        {stage !== null && (
          <StripMap
            line="danus"
            aria-label="Order progress"
            current={stage}
            state={order.status === "picked_up" ? "arrived" : "running"}
            stops={(order.delivery ? DELIVERY_ROUTE : ORDER_ROUTE).map((label, i) => ({
              label,
              note: stageNote(order, i, stage),
            }))}
          />
        )}
      </StationNameplate>

      <StatusPanel order={order} campaign={campaign} />

      <Items order={order} />

      {order.buyer && (
        <section aria-labelledby="pemesan" className="flex flex-col gap-2">
          <h2 id="pemesan" className="type-heading-sm text-text">
            Pemesan
          </h2>
          <p className="type-body text-text">
            {order.buyer.name} · WeChat {order.buyer.wechatId}
            {order.buyer.phone && ` · ${order.buyer.phone}`}
          </p>
          {order.delivery && <p className="type-body text-text">Delivered to {order.delivery.address}</p>}
          <p className="type-caption text-muted">
            This order is also in Your orders, in your account.
          </p>
        </section>
      )}
    </Container>
  )
}

function stageNote(order: Order, index: number, stage: number) {
  if (index !== stage) return undefined
  if (order.status === "pending_payment" && order.expiresAt) {
    return `Before ${formatTime(order.expiresAt)}`
  }
  if (order.status === "awaiting_verification") return "Waiting for Danus"
  if (order.status === "paid") return order.delivery ? slotLabel(order.delivery.slot) : "Show QR at the booth"
  if (order.status === "picked_up" && order.pickedUpAt) return `Done · ${formatTime(order.pickedUpAt)}`
  return undefined
}

async function StatusPanel({ order, campaign }: { order: Order; campaign: Campaign }) {
  const rejection = openRejection(order)
  switch (order.status) {
    case "pending_payment":
      return (
        <section aria-labelledby="pay" className="flex flex-col gap-6">
          <h2 id="pay" className="sr-only">
            Payment
          </h2>
          {rejection && (
            <Alert variant="danger">
              <AlertTitle>Your last proof was rejected</AlertTitle>
              <AlertDescription>{rejection.reason}. Fix it, then send a new proof.</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1 rounded-xl bg-surface p-6">
            <span className="type-caption text-muted">Total to transfer</span>
            <span className="type-numeral text-text">{formatYuan(order.totalFen)}</span>
            <span className="type-body text-text">
              Write <strong>{order.code}</strong> in the transfer note.
            </span>
            {order.expiresAt && (
              <span className="type-body-sm text-muted">
                Send your proof before {when(order.expiresAt)} Shenzhen time, or the order is canceled
                automatically.
              </span>
            )}
          </div>
          <ProofForm
            token={order.token}
            accounts={campaign.paymentAccounts.map((a) => ({
              ...a,
              qrImageUrl: a.qrImagePath ? mediaUrl(a.qrImagePath) : undefined,
            }))}
          />
        </section>
      )

    case "awaiting_verification":
      return (
        <Alert>
          <AlertTitle>Proof of payment received</AlertTitle>
          <AlertDescription>
            Sent {order.payment.submittedAt && when(order.payment.submittedAt)}. Danus will
            check your transfer, then{" "}
            {order.delivery
              ? `your order is delivered ${slotLabel(order.delivery.slot)}.`
              : "your pickup QR code appears on this page by itself."}{" "}
            If you close this page, open it again from Your orders.
          </AlertDescription>
        </Alert>
      )

    case "paid": {
      if (order.delivery) return <DeliveryPanel delivery={order.delivery} />
      const url = `${await siteOrigin()}${orderPath(order.token)}`
      const partial = order.items.some((i) => i.pickedUp)
      const units = order.items.reduce((sum, i) => sum + i.qty, 0)
      // Payment checked minutes ago: the ticket comes out of the machine (the watcher refreshes the page then).
      const verifiedAt = order.payment.verifiedAt
      const fresh = !partial && !!verifiedAt && new Date().getTime() - verifiedAt.getTime() < FRESH_TICKET_MS
      return (
        <div className="flex flex-col gap-4">
          <Ticket aria-labelledby="pickup" dispense={fresh}>
            <TicketBody line="danus">
              <TicketHeader>
                <LineBadge code="danus" />
                <span className="type-sign text-muted">Pickup</span>
              </TicketHeader>
              <TicketTitle id="pickup">{campaign.name}</TicketTitle>
              <TicketFields>
                <TicketField label="Order">
                  <StationCode code={order.code} line="danus" />
                </TicketField>
                <TicketField label="Items">{units}</TicketField>
                <TicketField label="Pick up at" className="col-span-2">
                  {campaign.pickupInfo}
                </TicketField>
              </TicketFields>
            </TicketBody>
            <TicketStub>
              <OrderQr url={url} code={order.code} />
              <TicketCode>{order.code}</TicketCode>
              <p className="max-w-[44ch] text-center type-caption text-muted">
                Show this QR code at the booth. Take a screenshot of this page so you can open it without internet.
              </p>
            </TicketStub>
          </Ticket>
          {partial && (
            <Alert variant="warning">
              <AlertTitle>Partly picked up</AlertTitle>
              <AlertDescription>Pick up the rest with the same QR code.</AlertDescription>
            </Alert>
          )}
        </div>
      )
    }

    case "picked_up":
      return (
        <Alert variant="success">
          <AlertTitle>{order.delivery ? "Order delivered" : "Order picked up"}</AlertTitle>
          <AlertDescription>
            {order.pickedUpAt && `${order.delivery ? "Delivered" : "Handed over"} ${when(order.pickedUpAt)}. `}Thank
            you for supporting Danus PPIT Shenzhen.
          </AlertDescription>
        </Alert>
      )

    case "expired":
      return (
        <div className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertTitle>The payment deadline has passed</AlertTitle>
            <AlertDescription>
              This order was canceled automatically and its stock released. Already transferred? Contact
              Danus and give the code {order.code}. Or <Link as={NextLink} href={`/${campaign.slug}`}>order again</Link>.
            </AlertDescription>
          </Alert>
          <RefundNote order={order} />
        </div>
      )

    case "cancelled":
      return (
        <div className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertTitle>Danus canceled this order</AlertTitle>
            <AlertDescription>
              {order.cancelReason ? `${order.cancelReason}. ` : ""}
              {order.refund
                ? `Questions? Contact Danus and give the code ${order.code}.`
                : `Contact Danus with questions or about a refund, and give the code ${order.code}.`}
            </AlertDescription>
          </Alert>
          <RefundNote order={order} />
        </div>
      )
  }
}

function DeliveryPanel({ delivery }: { delivery: NonNullable<Order["delivery"]> }) {
  return (
    <section aria-labelledby="delivery" className="flex flex-col gap-4 rounded-xl bg-surface p-6">
      <h2 id="delivery" className="type-heading-md text-text">
        {delivery.sentAt ? "On its way" : "Payment checked"}
      </h2>
      <dl className="grid gap-x-6 gap-y-2 type-body sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted">Delivery slot</dt>
        <dd className="text-text">{slotLabel(delivery.slot)} Shenzhen time</dd>
        <dt className="text-muted">Address</dt>
        <dd className="text-text">{delivery.address}</dd>
        {delivery.sentAt && (
          <>
            <dt className="text-muted">Courier</dt>
            <dd className="text-text">{delivery.courier}</dd>
            <dt className="text-muted">Tracking number</dt>
            <dd className="text-text">{delivery.trackingNumber}</dd>
          </>
        )}
      </dl>
      <p className="type-body-sm text-muted">
        {delivery.sentAt
          ? "Track it with the tracking number in the courier's app."
          : "Danus delivers your order in this slot. Keep your phone on."}
      </p>
    </section>
  )
}

function RefundNote({ order }: { order: Order }) {
  if (!order.refund) return null
  return (
    <Alert variant="success">
      <AlertTitle>Refunded</AlertTitle>
      <AlertDescription>
        {formatYuan(order.refund.amountFen)} via {PAYMENT_METHOD_LABELS[order.refund.method]},{" "}
        {when(order.refund.at)} Shenzhen time.
      </AlertDescription>
    </Alert>
  )
}

function Items({ order }: { order: Order }) {
  const showPickup = order.status === "paid" && order.items.some((i) => i.pickedUp)
  return (
    <section aria-labelledby="items" className="flex flex-col gap-3">
      <h2 id="items" className="type-heading-lg text-text">
        Items
      </h2>
      <ul className="flex flex-col">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-4 border-t py-3">
            <span className="flex flex-col">
              <span className="type-body text-text">
                {item.name}
                {item.variantLabel && ` · ${item.variantLabel}`}
              </span>
              <span className="type-caption text-muted">
                {item.qty} × {formatYuan(item.priceFen)}
                {showPickup && (item.pickedUp ? " · picked up" : " · not picked up")}
              </span>
            </span>
            <span className="type-ui text-text">{formatYuan(item.qty * item.priceFen)}</span>
          </li>
        ))}
        {order.delivery && (
          <li className="flex items-baseline justify-between gap-4 border-t py-3">
            <span className="type-body text-text">Delivery fee</span>
            <span className="type-ui text-text">
              {order.delivery.feeFen === 0 ? "Free" : formatYuan(order.delivery.feeFen)}
            </span>
          </li>
        )}
        <li className="flex items-baseline justify-between gap-4 border-t-2 border-text pt-3">
          <span className="type-ui text-text">Total</span>
          <span className="type-heading-lg text-text">{formatYuan(order.totalFen)}</span>
        </li>
      </ul>
    </section>
  )
}
