import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { formatYuan } from "@ppitsz/ui/lib/format"
import { courierMessage, rejectionMessage } from "@/lib/buyer-message"
import { slotLabel } from "@/lib/campaign-copy"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { displayStatus } from "@/lib/domain/delivery"
import { can } from "@/lib/domain/lifecycle"
import { awaitsRefund, refundDue } from "@/lib/domain/order"
import { orderPath } from "@/lib/order-path"
import { requireStaff } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { staffNames } from "@/lib/server/staff"
import { getCampaign, getOrder } from "@/lib/store"
import { BuyerMessagePanel } from "@/components/staff/buyer-message"
import { ItemList, OrderStatusBadge, paymentDestination, ProofImage, when } from "@/components/staff/order-bits"
import { DeliveryActions } from "@/components/staff/delivery-actions"
import { CancelOrderButton, CopyBuyerLink, RefundButton, ReviewActions } from "@/components/staff/order-actions"

export const metadata: Metadata = { title: "Order details" }

export default async function OrderDetailPage({ params }: PageProps<"/staff/orders/[id]">) {
  const staff = await requireStaff()
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()
  const campaign = await getCampaign(order.campaignId)
  const names = await staffNames([
    order.payment.verifiedBy,
    order.handledBy,
    order.cancelledBy,
    order.refund?.by,
    order.delivery?.sentBy,
    ...order.rejections.map((r) => r.by),
  ])
  const nameOf = (uid: string | null | undefined) => (uid && names.get(uid)) || "staff"
  const now = new Date()
  const isWalkIn = order.channel === "walkin"
  const verifiable = can(order, "approve", staff, now)
  const cancellable = can(order, "cancel", staff, now)
  const refundable = can(order, "record_refund", staff, now)
  const destination = campaign ? paymentDestination(order, campaign) : null
  const orderUrl = `${await siteOrigin()}${orderPath(order.token)}`
  const buyerMessage = rejectionMessage(order, orderUrl) ?? courierMessage(order, orderUrl)
  const deliverable = !!order.delivery && can(order, "hand_over", staff, now)
  const delivery = order.delivery

  return (
    <Container narrow className="flex flex-col gap-10 py-10">
      <div className="flex flex-col gap-3">
        <Link as={NextLink} href="/staff/orders" variant="standalone" className="self-start">
          All orders
        </Link>
        <p className="type-kicker text-accent-text">
          {isWalkIn ? "Walk-in sale" : delivery ? "Delivery order" : "Pickup order"} · {campaign?.name}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="type-display-xl text-text">{order.code}</h1>
          <OrderStatusBadge status={displayStatus(order)} />
        </div>
      </div>

      {verifiable && (
        <section aria-labelledby="check" className="flex flex-col gap-4">
          <h2 id="check" className="type-heading-lg text-text">
            Check payment
          </h2>
          <ReviewActions orderId={order.id} code={order.code} primary />
        </section>
      )}

      {order.cancelReason && (
        <Alert variant="warning">
          <AlertTitle>Canceled</AlertTitle>
          <AlertDescription>
            {order.cancelReason} · oleh {nameOf(order.cancelledBy)}
          </AlertDescription>
        </Alert>
      )}

      {delivery && (
        <section aria-labelledby="delivery" className="flex flex-col gap-3">
          <h2 id="delivery" className="type-heading-lg text-text">
            Pengantaran
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 type-body-sm">
            <Row term="Slot" value={slotLabel(delivery.slot)} />
            <Row term="Address" value={delivery.address} />
            <Row term="Delivery fee" value={formatYuan(delivery.feeFen)} />
            {delivery.sentAt && (
              <Row
                term="Courier"
                value={`${delivery.courier} · tracking ${delivery.trackingNumber} · ${when(delivery.sentAt)} · ${nameOf(delivery.sentBy)}`}
              />
            )}
          </dl>
          {deliverable && (
            <DeliveryActions
              orderId={order.id}
              code={order.code}
              courier={
                delivery.sentAt
                  ? { name: delivery.courier ?? "", trackingNumber: delivery.trackingNumber ?? "" }
                  : undefined
              }
            />
          )}
        </section>
      )}

      {awaitsRefund(order) && (
        <Alert variant="danger">
          <AlertTitle>The buyer hasn't been refunded</AlertTitle>
          <AlertDescription>
            {formatYuan(refundDue(order))} for the items not handed over
            {delivery ? " and the delivery fee" : ""}. Send it by WeChat,
            Alipay or bank, then record it with the button below.
          </AlertDescription>
        </Alert>
      )}

      {buyerMessage && (
        <section aria-labelledby="tell-buyer" className="flex flex-col gap-3">
          <h2 id="tell-buyer" className="type-heading-lg text-text">
            Tell the buyer
          </h2>
          <BuyerMessagePanel message={buyerMessage} />
        </section>
      )}

      {order.buyer && (
        <section aria-labelledby="buyer" className="flex flex-col gap-2">
          <h2 id="buyer" className="type-heading-lg text-text">
            Buyer
          </h2>
          <p className="type-body text-text">{order.buyer.name}</p>
          <p className="type-body-sm text-muted">
            WeChat {order.buyer.wechatId}
            {order.buyer.phone && ` · HP ${order.buyer.phone}`}
            {order.buyer.email && ` · ${order.buyer.email}`}
          </p>
        </section>
      )}

      <section aria-labelledby="items" className="flex flex-col gap-3">
        <h2 id="items" className="type-heading-lg text-text">
          Items
        </h2>
        <ItemList order={order} showPickup={order.status === "paid" || order.status === "picked_up"} />
      </section>

      <section aria-labelledby="pay" className="flex flex-col gap-3">
        <h2 id="pay" className="type-heading-lg text-text">
          Payment
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 type-body-sm">
          {destination && <Row term="Paid via" value={destination} />}
          {order.payment.submittedAt && <Row term="Proof sent" value={when(order.payment.submittedAt)} />}
          {order.payment.verifiedAt && !isWalkIn && (
            <Row
              term="Diverifikasi"
              value={`${when(order.payment.verifiedAt)} · ${nameOf(order.payment.verifiedBy)}`}
            />
          )}
          {order.rejections.map((r) => (
            <Row key={r.at.getTime()} term="Rejected" value={`${when(r.at)} · ${nameOf(r.by)} · ${r.reason}`} />
          ))}
          {order.status === "pending_payment" && order.expiresAt && (
            <Row term="Payment deadline" value={when(order.expiresAt)} />
          )}
          {order.refund && (
            <Row
              term="Refunded"
              value={[
                `${formatYuan(order.refund.amountFen)} via ${PAYMENT_METHOD_LABELS[order.refund.method]}`,
                when(order.refund.at),
                nameOf(order.refund.by),
                order.refund.note,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
        </dl>
        {!isWalkIn && <ProofImage order={order} />}
      </section>

      <section aria-labelledby="riwayat" className="flex flex-col gap-3">
        <h2 id="riwayat" className="type-heading-lg text-text">
          Riwayat
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 type-body-sm">
          <Row term="Created" value={when(order.createdAt)} />
          {order.pickedUpAt && (
            <Row
              term={delivery ? "Delivered" : order.status === "picked_up" ? "Handed over" : "Last handed over"}
              value={`${when(order.pickedUpAt)} · ${nameOf(order.handledBy)}`}
            />
          )}
          {order.cancelledAt && (
            <Row term="Canceled" value={`${when(order.cancelledAt)} · ${nameOf(order.cancelledBy)}`} />
          )}
        </dl>
      </section>

      {(!isWalkIn || cancellable) && (
        <div className="flex flex-wrap gap-3 border-t pt-6">
          {refundable && (
            <RefundButton
              orderId={order.id}
              code={order.code}
              dueFen={refundDue(order)}
              method={order.payment.method}
            />
          )}
          {!isWalkIn && <CopyBuyerLink token={order.token} />}
          {cancellable && <CancelOrderButton orderId={order.id} code={order.code} />}
        </div>
      )}
    </Container>
  )
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{term}</dt>
      <dd className="text-text">{value}</dd>
    </>
  )
}
