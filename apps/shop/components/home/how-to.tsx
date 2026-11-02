import NextLink from "next/link"
import { MapPinIcon, ReceiptIcon, ShoppingBagIcon, TruckIcon } from "@phosphor-icons/react/ssr"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { slotLabel } from "@/lib/campaign-copy"
import type { CampaignOffers, DeliverySlot } from "@/lib/domain/types"

/*
 * "How to order": three numbered steps that follow what the open campaigns
 * offer, then where and when orders are collected or delivered.
 */

export function HowTo({
  offers,
  pickupPlaces,
  slots,
}: {
  /** Switched on when any open campaign offers it. */
  offers: Pick<CampaignOffers, "delivery" | "pickup">
  pickupPlaces: string[]
  /** Upcoming delivery slots of open campaigns, earliest first. */
  slots: DeliverySlot[]
}) {
  const last =
    offers.delivery && offers.pickup
      ? { title: "Delivered or picked up", text: "Delivery orders arrive in the slot you chose. For Pickup, show your QR code to Danus.", Icon: TruckIcon }
      : offers.delivery
        ? { title: "Delivered to your address", text: "Danus or a courier delivers in the slot you chose when ordering.", Icon: TruckIcon }
        : { title: "Show your QR, get your order", text: "Come to the pickup place, and Danus scans your QR code and hands over your order.", Icon: MapPinIcon }
  const steps = [
    {
      title: "Order and transfer",
      text: "Choose products, sign in to your account, then pay by WeChat Pay, Alipay or bank transfer and upload the proof.",
      Icon: ShoppingBagIcon,
    },
    {
      title: "Danus mengecek",
      text: "Danus checks your transfer proof. Every step shows in Your orders.",
      Icon: ReceiptIcon,
    },
    last,
  ]

  return (
    <section id="how-to-order" aria-labelledby="how-to-order-title" className="scroll-mt-20 bg-surface">
      <Container className="@container flex flex-col gap-10 py-12 lg:py-20">
        <div className="flex flex-col gap-3">
          <p className="type-kicker text-accent-text">How to order</p>
          <h2 id="how-to-order-title" className="type-display-lg text-text">
            Three steps, no queue.
          </h2>
        </div>
        <ol className="grid gap-4 @3xl:grid-cols-3">
          {steps.map(({ title, text, Icon }, i) => (
            <li key={title} className="flex flex-col gap-4 rounded-xl border bg-bg p-5">
              <div className="flex items-start justify-between">
                <Icon aria-hidden className="size-8 text-accent-text" />
                <span aria-hidden className="type-numeral text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="type-heading-md text-text">{title}</h3>
              <p className="type-body-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>

        {(pickupPlaces.length > 0 || slots.length > 0) && (
          <div className="flex flex-col gap-6 rounded-xl border bg-bg p-5 @3xl:flex-row @3xl:items-center">
            {pickupPlaces.length > 0 && (
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="type-kicker text-muted">Pickup place</h3>
                <p className="type-heading-sm text-text">{pickupPlaces.join(" · ")}</p>
              </div>
            )}
            {slots.length > 0 && (
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="type-kicker text-muted">Next delivery slots</h3>
                <p className="type-heading-sm text-text">{slots.map(slotLabel).join(" · ")}</p>
              </div>
            )}
            <NextLink href="/orders" className={buttonVariants({ className: "self-start @3xl:self-center" })}>
              See your orders
            </NextLink>
          </div>
        )}
      </Container>
    </section>
  )
}
