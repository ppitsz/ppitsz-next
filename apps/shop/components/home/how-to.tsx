import NextLink from "next/link"
import { MapPinIcon, QrCodeIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import { Container } from "@ppitsz/ui/components/container"
import { Timetable } from "@ppitsz/ui/components/blocks/timetable"
import { Route, RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { Sign, SignBoard, SignPictogram } from "@ppitsz/ui/components/network/sign"
import type { CampaignOffers, DeliverySlot } from "@/lib/domain/types"

/*
 * "How to order": three steps as stops on the Danus line, following what the
 * open campaigns offer. Then where orders end up, as a station would post
 * it: the pickup places on a sign board (with the way to Your orders), and
 * the next delivery slots on a timetable beside it.
 */

const SLOT_LABELS = ["Next slot", "After that", "Then"]

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
      ? { title: "Delivered or picked up", text: "Delivery orders arrive in the slot you chose. For Pickup, show us your QR code." }
      : offers.delivery
        ? { title: "Delivered to your address", text: "We deliver, or send a courier, in the slot you chose when ordering." }
        : { title: "Show your QR, get your order", text: "Come to the pickup place, and we scan your QR code and hand over your order." }
  const steps = [
    {
      title: "Order and transfer",
      text: "Choose products, sign in to your account, then pay by WeChat Pay, Alipay or bank transfer and upload the proof.",
    },
    {
      title: "We check",
      text: "We check your transfer proof. Every step shows in Your orders.",
    },
    last,
  ]
  // The steps as stops on the Danus line, as on a campaign's page.
  const stops = steps.map(({ title, text }) => (
    <RouteStop key={title} state="upcoming">
      <span className="type-heading-sm text-text">{title}</span>
      <span className="max-w-[36ch] type-body-sm text-muted">{text}</span>
    </RouteStop>
  ))

  return (
    <section id="how-to-order" aria-labelledby="how-to-order-title" className="scroll-mt-20 bg-surface">
      <Container className="@container flex flex-col gap-10 py-12 lg:py-20">
        <div className="flex flex-col gap-3">
          <Route data-line="danus" className="w-10" />
          <p className="type-kicker text-accent-text">How to order</p>
          <h2 id="how-to-order-title" className="type-display-lg text-text">
            Three steps, no queue.
          </h2>
        </div>
        <div data-line="danus">
          <RouteList orientation="vertical" aria-label="Steps" className="@3xl:hidden">
            {stops}
          </RouteList>
          <RouteList orientation="horizontal" aria-label="Steps" className="hidden @3xl:flex">
            {stops}
          </RouteList>
        </div>

        {(pickupPlaces.length > 0 || slots.length > 0) && (
          <div
            className={cn(
              "grid items-start gap-6",
              slots.length > 0 && "@3xl:grid-cols-[minmax(0,1fr)_20rem] @3xl:gap-8"
            )}
          >
            {/* Where it ends: the pickup places as station signs, and the way to your orders. */}
            <SignBoard aria-label="Where orders end up">
              {pickupPlaces.map((place) => (
                <Sign
                  key={place}
                  headingLevel="h3"
                  lead={
                    <SignPictogram>
                      <MapPinIcon />
                    </SignPictogram>
                  }
                  title={place}
                  description="Pickup place: show us your QR code here"
                />
              ))}
              <Sign
                href="/orders"
                linkAs={NextLink}
                direction="right"
                headingLevel="h3"
                lead={
                  <SignPictogram>
                    <QrCodeIcon />
                  </SignPictogram>
                }
                title="Your orders"
                description="Your QR codes, and when each order arrives"
              />
            </SignBoard>
            {slots.length > 0 && (
              <Timetable
                title="Next delivery slots"
                className="bg-bg"
                line="danus"
                headingLevel="h3"
                rows={slots.map((slot, i) => ({
                  label: SLOT_LABELS[i] ?? "Later",
                  at: slot.startsAt,
                  until: slot.endsAt,
                }))}
              />
            )}
          </div>
        )}
      </Container>
    </section>
  )
}
