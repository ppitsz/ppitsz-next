import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { CheckIcon } from "@phosphor-icons/react/ssr"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { daysOf } from "@/lib/domain/tickets"
import { dayLabel, sortedDays, when } from "@/lib/form-copy"
import { requireFormAccess } from "@/lib/server/auth"
import { listResponses } from "@/lib/store"
import { PrintButton } from "@/components/staff/print-button"

export const metadata: Metadata = { title: "Check-in list" }

/**
 * The paper backup for the door: every live ticket by name, with a box per
 * day it is valid (ticked where the check-in is already in). Outside the dashboard
 * layout, so it prints without the header, and always light, since paper is white.
 */
export default async function PrintListPage({ params }: PageProps<"/staff/print/[formId]">) {
  await connection()
  const { form } = await requireFormAccess((await params).formId)
  if (!form.tickets.enabled) notFound()
  const now = new Date()
  const days = sortedDays(form.tickets.days)
  const typeName = new Map(form.tickets.types.map((t) => [t.id, t.name]))
  const tickets = (await listResponses(form.id))
    .filter((r) => r.status === "live")
    .sort((a, b) => a.identity.name.localeCompare(b.identity.name, "id"))

  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <Container className="flex flex-col gap-6 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link as={NextLink} href={`/staff/${form.id}/scan`} variant="standalone">
            Back to scan
          </Link>
          <PrintButton />
        </div>
        <div className="flex flex-col gap-2">
          <p className="type-kicker text-accent-text">{form.title}</p>
          <h1 className="type-display-lg text-text">Check-in list</h1>
          <p className="max-w-[72ch] type-body-sm text-muted">
            Made {when(now)} Shenzhen time: {tickets.length} live {tickets.length === 1 ? "ticket" : "tickets"}, by name. Tickets made after this time
            aren't on the list. Tick who came, then record it in the app once the internet is back.
          </p>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-text">
              {days.map((d) => (
                <th key={d.id} scope="col" className="w-20 py-2 pe-3 type-sign text-muted">
                  {dayLabel(d).split(" · ")[0]}
                </th>
              ))}
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                Name
              </th>
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                Code
              </th>
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                Type
              </th>
              <th scope="col" className="py-2 type-sign text-muted">
                WeChat
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((r) => {
              const valid = new Set(daysOf(form, r.ticketTypeId).map((d) => d.id))
              return (
                <tr key={r.id} className="break-inside-avoid border-b align-top">
                  {days.map((d) => (
                    <td key={d.id} className="py-2 pe-3">
                      {valid.has(d.id) ? (
                        <span
                          role="img"
                          aria-label={r.checkIns[d.id] ? "Checked in" : "Not checked in"}
                          className="mt-0.5 flex size-5 items-center justify-center rounded-md border-2 border-text"
                        >
                          {r.checkIns[d.id] && <CheckIcon aria-hidden weight="bold" className="size-3.5" />}
                        </span>
                      ) : (
                        <span className="type-caption text-muted">not valid</span>
                      )}
                    </td>
                  ))}
                  <th scope="row" className="py-2 pe-4 type-ui text-text">
                    {r.identity.name}
                  </th>
                  <td className="py-2 pe-4 type-sign text-text">{r.code}</td>
                  <td className="py-2 pe-4 type-body-sm text-text">{typeName.get(r.ticketTypeId ?? "")}</td>
                  <td className="py-2 type-body-sm text-text">{r.identity.wechatId}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Container>
    </div>
  )
}
