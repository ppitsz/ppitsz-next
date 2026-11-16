import { connection } from "next/server"

import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { listPublicForms } from "@/lib/store"
import { FormBoard } from "@/components/form-board"

/**
 * The open forms, as a departure board. Registration only: the event
 * calendar itself lives on the main site, which links straight to each
 * form's address.
 */
export default async function HomePage() {
  await connection()
  const now = new Date()
  const forms = await listPublicForms(now)

  return (
    <Container className="flex flex-col gap-10 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">Departures</p>
        <h1 className="type-display-xl text-text">Open forms</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          Sign up for events, get tickets, or fill in PPITSZ forms. Your tickets and the links to your answers are emailed to you, and
          you can open them again any time. Times are Shenzhen time.
        </p>
      </div>

      {forms.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No departures scheduled</EmptyTitle>
            <EmptyDescription>No forms are open. The next events are announced on the PPITSZ socials.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FormBoard forms={forms} now={now} />
      )}
    </Container>
  )
}
