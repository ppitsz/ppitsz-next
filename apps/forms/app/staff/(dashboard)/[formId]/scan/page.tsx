import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Link } from "@ppitsz/ui/components/link"
import { expectedOn } from "@/lib/domain/results"
import { defaultDay, typeAvailability } from "@/lib/domain/tickets"
import { dayLabel, sortedDays } from "@/lib/form-copy"
import { requireFormAccess } from "@/lib/server/auth"
import { listResponses } from "@/lib/store"
import { Scanner } from "@/components/staff/scanner"

export const metadata: Metadata = { title: "Scan" }

export default async function ScanPage({ params }: PageProps<"/staff/[formId]/scan">) {
  await connection()
  const { form } = await requireFormAccess((await params).formId)
  if (!form.tickets.enabled) notFound()
  const now = new Date()
  const responses = await listResponses(form.id)
  const days = sortedDays(form.tickets.days).map((d) => ({
    id: d.id,
    label: dayLabel(d),
    expected: expectedOn(form, responses, d.id),
    present: responses.filter((r) => r.status === "live" && r.checkIns[d.id]).length,
  }))
  const start = defaultDay(form, now)

  return (
    <div className="flex flex-col gap-6">
      {form.cancelledAt && (
        <Alert variant="danger">
          <AlertTitle>Event canceled</AlertTitle>
          <AlertDescription>Every ticket is refused at the scanner.</AlertDescription>
        </Alert>
      )}
      {days.length === 0 || !start ? (
        <p className="type-body text-muted">Add event days under Edit form first.</p>
      ) : (
        <Scanner
          formId={form.id}
          days={days}
          defaultDayId={start.id}
          types={form.tickets.types.map((t) => ({ id: t.id, name: t.name, full: typeAvailability(form, t, now).left === 0 }))}
        />
      )}
      <p className="type-body-sm text-muted">
        Internet putus?{" "}
        <Link as={NextLink} href={`/staff/print/${form.id}`}>
          Print the check-in list
        </Link>{" "}
        before the event as a backup, then record check-ins in the app once the internet is back.
      </p>
    </div>
  )
}
