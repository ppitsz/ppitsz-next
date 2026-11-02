import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { slotLabel } from "@/lib/campaign-copy"
import { deliveryList } from "@/lib/domain/delivery"
import { requireStaff } from "@/lib/server/auth"
import { listAwaitingDelivery, listCampaigns } from "@/lib/store"
import { itemsSummary, when } from "@/components/staff/order-bits"
import { PrintButton } from "@/components/staff/print-button"

export const metadata: Metadata = { title: "Delivery list" }

/**
 * The delivery run on paper: paid delivery orders not delivered yet, one table
 * per slot, each slot on its own page. Outside the dashboard layout, so it
 * prints without the header, and always light, since paper is white.
 */
export default async function DeliveryListPage() {
  await requireStaff()
  const now = new Date()
  const [orders, campaigns] = await Promise.all([listAwaitingDelivery(), listCampaigns()])
  const nameOf = new Map(campaigns.map((c) => [c.id, c.name]))
  const groups = deliveryList(orders)
  const several = new Set(orders.map((o) => o.campaignId)).size > 1

  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <Container className="flex flex-col gap-6 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link as={NextLink} href="/staff/delivery" variant="standalone">
            Back to the dashboard
          </Link>
          <PrintButton />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="type-display-lg text-text">Delivery list</h1>
          <p className="max-w-[72ch] type-body-sm text-muted">
            Made {when(now)} Shenzhen time: {orders.length} paid {orders.length === 1 ? "order" : "orders"} not delivered yet. Orders
            paid after this time aren't on the list. Mark them delivered in the app once they arrive.
          </p>
        </div>

        {groups.length === 0 && <p className="type-body text-muted">No orders waiting for delivery.</p>}

        {groups.map(({ slot, orders: inSlot }) => (
          <section key={`${slot.id}-${slot.startsAt.getTime()}`} className="flex flex-col gap-3 break-before-page first-of-type:break-before-auto">
            <h2 className="type-heading-lg text-text">{slotLabel(slot)}</h2>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-text">
                  <th scope="col" className="w-8 py-2 pe-3 type-sign text-muted">
                    <span className="sr-only">Delivered</span>
                  </th>
                  <th scope="col" className="py-2 pe-4 type-sign text-muted">
                    Buyer
                  </th>
                  <th scope="col" className="py-2 pe-4 type-sign text-muted">
                    Address
                  </th>
                  <th scope="col" className="py-2 type-sign text-muted">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody>
                {inSlot.map((order) => (
                  <tr key={order.id} className="break-inside-avoid border-b align-top">
                    <td className="py-2 pe-3">
                      <span aria-hidden className="mt-0.5 block size-5 rounded-md border-2 border-text" />
                    </td>
                    <th scope="row" className="py-2 pe-4 text-left">
                      <span className="block type-ui text-text">{order.buyer?.name}</span>
                      <span className="block type-sign text-text">{order.code}</span>
                      <span className="block type-caption text-muted">Phone {order.buyer?.phone}</span>
                      {several && <span className="block type-caption text-muted">{nameOf.get(order.campaignId)}</span>}
                    </th>
                    <td className="py-2 pe-4 type-body-sm text-text">
                      {order.delivery!.address}
                      {order.delivery!.sentAt && (
                        <span className="block type-caption text-muted">
                          {order.delivery!.courier} · {order.delivery!.trackingNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2 type-body-sm text-text">{itemsSummary(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </Container>
    </div>
  )
}
