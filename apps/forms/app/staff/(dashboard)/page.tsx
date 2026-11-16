import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"

import { Badge } from "@ppitsz/ui/components/badge"
import { Card, CardDescription, CardHeader, CardKicker, CardLink, CardTitle } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { formPhase, teamMayAccess } from "@/lib/domain/form"
import type { Form } from "@/lib/domain/types"
import { PHASE_BADGE } from "@/lib/labels"
import { requireStaff } from "@/lib/server/auth"
import { listForms, listMemberForms } from "@/lib/store"
import { CreateForm } from "@/components/staff/create-form"

export const metadata: Metadata = { title: "Forms" }

/** Every form for an admin; a member's own forms (until they end) for organizers. */
export default async function FormsPage() {
  await connection()
  const staff = await requireStaff()
  const forms = staff.isAdmin ? await listForms() : (await listMemberForms(staff.uid)).filter(teamMayAccess)
  const now = new Date()
  const active = forms.filter((f) => f.status !== "done")
  const done = forms.filter((f) => f.status === "done")

  return (
    <Container className="flex flex-col gap-10 py-10 lg:py-14">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">{staff.isAdmin ? "Form admin" : "Organizer"}</p>
        <h1 className="type-display-xl text-text">Forms</h1>
      </div>

      {staff.isAdmin && <CreateForm />}

      {active.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No forms yet</EmptyTitle>
            <EmptyDescription>
              {staff.isAdmin ? "Create the first form above." : "You aren't an organizer of any running form yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FormGrid forms={active} uid={staff.uid} now={now} />
      )}

      {done.length > 0 && (
        <section aria-labelledby="ended" className="flex flex-col gap-4">
          <h2 id="ended" className="type-heading-lg text-text">
            Ended
          </h2>
          <FormGrid forms={done} uid={staff.uid} now={now} />
        </section>
      )}
    </Container>
  )
}

function FormGrid({ forms, uid, now }: { forms: Form[]; uid: string; now: Date }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {forms.map((form) => {
        const fresh = form.counts.total - (form.seen[uid] ?? 0)
        return (
          <li key={form.id}>
            <Card variant="link" className="h-full">
              <CardHeader>
                <CardKicker className="flex flex-wrap items-center gap-2">
                  <LineBadge code={form.line} />
                  <StatusBadge domain="form" value={form.cancelledAt ? "cancelled" : PHASE_BADGE[formPhase(form, now)]} />
                  {form.tickets.enabled && <Badge variant="outline">Tickets</Badge>}
                  {fresh > 0 && <Badge variant="highlight">{formatNumber(fresh)} new</Badge>}
                </CardKicker>
                <CardTitle>
                  <CardLink as={NextLink} href={`/staff/${form.id}`}>
                    {form.title}
                  </CardLink>
                </CardTitle>
                <CardDescription>
                  {formatNumber(form.counts.live)} {form.counts.live === 1 ? "response" : "responses"}
                  {form.tickets.enabled && form.tickets.capacity !== null && ` of ${formatNumber(form.tickets.capacity)} places`}
                  {" · "}/{form.slug}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
