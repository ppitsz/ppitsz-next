import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { cn } from "@ppitsz/ui/lib/utils"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { attendance } from "@/lib/domain/results"
import { dayLabel, sortedDays } from "@/lib/form-copy"
import { requireFormAccess } from "@/lib/server/auth"
import { listResponses } from "@/lib/store"

export const metadata: Metadata = { title: "Check-in" }

/** Who came, per day and ticket type, out of the live tickets valid that day. */
export default async function AttendancePage({ params }: PageProps<"/staff/[formId]/check-in">) {
  await connection()
  const { form } = await requireFormAccess((await params).formId)
  if (!form.tickets.enabled) notFound()
  const responses = await listResponses(form.id)
  const rows = attendance(form, responses)
  const days = sortedDays(form.tickets.days)
  const door = responses.filter((r) => r.status === "live" && r.source === "door").length

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className="py-2 pe-4 text-left align-bottom type-sign text-muted">
                Ticket type
              </th>
              <th scope="col" className="py-2 pe-4 text-right align-bottom type-sign text-muted">
                Tickets
              </th>
              {days.map((d) => (
                <th key={d.id} scope="col" className="py-2 pe-4 text-right align-bottom type-sign text-muted">
                  Checked in {dayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.typeId ?? "total"} className={cn("border-b", row.typeId === null && "border-t-2 border-t-text")}>
                <th scope="row" className="py-2 pe-4 text-left align-top type-body-sm text-text">
                  {row.label}
                </th>
                <td className="py-2 pe-4 text-right align-top type-body-sm text-text">{formatNumber(row.tickets)}</td>
                {days.map((d) => {
                  const n = row.perDay[d.id]
                  return (
                    <td key={d.id} className="py-2 pe-4 text-right align-top type-body-sm text-text">
                      {n === null || n === undefined ? (
                        <span className="text-muted">not valid</span>
                      ) : (
                        <>
                          {formatNumber(n)}
                          {row.tickets > 0 && <span className="text-muted"> · {Math.round((n / row.tickets) * 100)}%</span>}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-body-sm text-muted">
        Percentages are of that type's live tickets. {formatNumber(door)} {door === 1 ? "ticket was" : "tickets were"} made by walk-in sign-up. Canceled tickets
        aren't counted.
      </p>
    </div>
  )
}
