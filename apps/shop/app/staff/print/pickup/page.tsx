import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { pickupPointLabel } from "@/lib/campaign-copy"
import { byPickupPoint, pickupList } from "@/lib/domain/recap"
import { requireStaff } from "@/lib/server/auth"
import { listCampaigns, listOrders } from "@/lib/store"
import { when } from "@/components/staff/order-bits"
import { PrintButton } from "@/components/staff/print-button"

export const metadata: Metadata = { title: "Pickup list" }

/**
 * The paper backup for the booth: every open campaign's paid online orders still
 * to collect, one table per pickup point, by buyer name. Outside the dashboard layout, so it prints
 * without the header, and always light, since paper is white.
 */
export default async function PickupListPage() {
  await requireStaff()
  const now = new Date()
  const open = (await listCampaigns()).filter((c) => c.status === "open")
  const nameOf = new Map(open.map((c) => [c.id, c.name]))
  const entries = pickupList((await listOrders(undefined, { now })).filter((o) => nameOf.has(o.campaignId)))
  const several = open.length > 1
  const groups = byPickupPoint(entries)

  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <Container className="flex flex-col gap-6 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link as={NextLink} href="/staff/scan" variant="standalone">
            Back to the dashboard
          </Link>
          <PrintButton />
        </div>

        <div className="flex flex-col gap-2">
          <p className="type-kicker text-accent-text">
            {open.length === 0 ? "No open campaigns" : open.map((c) => c.name).join(" · ")}
          </p>
          <h1 className="type-display-lg text-text">Pickup list</h1>
          <p className="max-w-[72ch] type-body-sm text-muted">
            Made {when(now)} Shenzhen time: {entries.length} paid {entries.length === 1 ? "order" : "orders"} not fully picked up,
            by pickup point and buyer name. Orders paid after this time aren't on the list. Tick what's been
            handed over, then hand it over in the app too once the internet is back.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="type-body text-muted">No orders waiting for pickup.</p>
        ) : (
          groups.map(({ point, entries }) => (
            <section
              key={point ? `${point.id}/${point.startsAt.getTime()}` : "none"}
              className="flex flex-col gap-2"
            >
              <h2 className="type-heading-lg text-text">
                {point ? pickupPointLabel(point) : "No pickup point chosen"}
                <span className="type-body-sm text-muted"> · {entries.length} {entries.length === 1 ? "order" : "orders"}</span>
              </h2>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-text">
                    <th scope="col" className="w-8 py-2 pe-3 type-sign text-muted">
                      <span className="sr-only">Handed over</span>
                    </th>
                    <th scope="col" className="py-2 pe-4 type-sign text-muted">
                      Name
                    </th>
                    <th scope="col" className="py-2 pe-4 type-sign text-muted">
                      Code
                    </th>
                    <th scope="col" className="py-2 pe-4 type-sign text-muted">
                      WeChat
                    </th>
                    <th scope="col" className="py-2 type-sign text-muted">
                      Not picked up
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.orderId} className="break-inside-avoid border-b align-top">
                      <td className="py-2 pe-3">
                        <span aria-hidden className="mt-0.5 block size-5 rounded-md border-2 border-text" />
                      </td>
                      <th scope="row" className="py-2 pe-4 type-ui text-text">
                        {entry.name}
                      </th>
                      <td className="py-2 pe-4 type-sign text-text">
                        {entry.code}
                        {several && <span className="block type-caption text-muted">{nameOf.get(entry.campaignId)}</span>}
                      </td>
                      <td className="py-2 pe-4 type-body-sm text-text">{entry.wechatId}</td>
                      <td className="py-2 type-body-sm text-text">
                        <ul>
                          {entry.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </Container>
    </div>
  )
}
