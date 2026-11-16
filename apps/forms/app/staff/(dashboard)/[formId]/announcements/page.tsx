import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { when } from "@/lib/form-copy"
import { requireFormAccess } from "@/lib/server/auth"
import { BroadcastForm } from "@/components/staff/team-forms"

export const metadata: Metadata = { title: "Announcements" }

/** Announcements organizers write to every live ticket holder: a change, or the event's cancellation. */
export default async function MessagesPage({ params }: PageProps<"/staff/[formId]/announcements">) {
  await connection()
  const { form } = await requireFormAccess((await params).formId)
  if (!form.tickets.enabled) notFound()
  const sent = [...form.broadcasts].sort((a, b) => +b.sentAt - +a.sentAt)

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      {form.cancelledAt ? (
        <Alert variant="danger">
          <AlertTitle>The event has been canceled</AlertTitle>
          <AlertDescription>There are no live tickets left to send an announcement to.</AlertDescription>
        </Alert>
      ) : (
        <section aria-labelledby="write" className="flex flex-col gap-4">
          <h2 id="write" className="type-heading-md text-text">
            Send an announcement
          </h2>
          <p className="max-w-[66ch] type-body-sm text-muted">
            For a change of schedule or venue, or anything else important. Emailed to every live ticket holder. There are
            no automatic reminders; send one yourself if needed.
          </p>
          <BroadcastForm formId={form.id} title={form.title} recipients={form.counts.live} />
        </section>
      )}

      {sent.length > 0 && (
        <section aria-labelledby="sent" className="flex flex-col gap-4">
          <h2 id="sent" className="type-heading-md text-text">
            Sent
          </h2>
          <ul className="flex flex-col gap-4">
            {sent.map((b) => (
              <li key={b.id} className="flex flex-col gap-1 border-b pb-4">
                <span className="type-ui text-text">
                  {b.kind === "cancel" ? "Pembatalan: " : ""}
                  {b.subject}
                </span>
                <span className="type-caption text-muted">
                  {when(b.sentAt)} · {b.byName} · to {formatNumber(b.recipients)} {b.recipients === 1 ? "person" : "people"}
                </span>
                <p className="type-body-sm whitespace-pre-line text-text">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
