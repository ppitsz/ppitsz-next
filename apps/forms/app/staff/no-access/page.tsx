import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { getSession } from "@ppitsz/accounts/session"
import { accountOrigin } from "@ppitsz/accounts/urls"
import { getStaff } from "@/lib/server/auth"
import { StaffChrome } from "@/components/staff-chrome"

export const metadata: Metadata = { title: "No access" }

/** A signed-in account that is neither a form admin nor an organizer of a form that hasn't ended. */
export default async function NoAccessPage() {
  await connection()
  const session = await getSession()
  if (!session) redirect("/staff/sign-in")
  if (await getStaff()) redirect("/staff")

  return (
    <StaffChrome staff={null}>
      <Container narrow className="flex flex-col gap-6 py-16">
        <p className="type-kicker text-accent-text">Forms dashboard</p>
        <h1 className="type-display-xl text-text">You aren&apos;t an organizer of any form yet</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          You&apos;re signed in as {session.email}. A form admin adds organizers to each form by email. Ask them to add this
          one.
        </p>
        <a href={accountOrigin()} className={`${buttonVariants()} self-start`}>
          Your PPITSZ account
        </a>
      </Container>
    </StaffChrome>
  )
}
