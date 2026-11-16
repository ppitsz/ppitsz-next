import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { getSession } from "@ppitsz/accounts/session"
import { accountOrigin } from "@ppitsz/accounts/urls"
import { getStaff } from "@/lib/server/auth"

export const metadata: Metadata = { title: "No access", robots: { index: false } }

/** A signed-in account without a shop role. A Portal admin gives roles on PPITSZ Account. */
export default async function NoAccessPage() {
  await connection()
  const session = await getSession()
  if (!session) redirect("/staff/sign-in")
  if (await getStaff()) redirect("/staff")

  return (
    <Container narrow className="flex flex-col gap-6 py-16">
      <p className="type-kicker text-accent-text">Shop dashboard</p>
      <h1 className="type-display-xl text-text">You don&apos;t have access to the Shop dashboard</h1>
      <p className="max-w-[66ch] type-lede text-muted">
        You&apos;re signed in as {session.email}, which isn&apos;t shop staff. If you should be, ask a Portal admin to give
        your account a shop role.
      </p>
      <div className="flex flex-wrap gap-3">
        <NextLink href="/" className={buttonVariants({ variant: "primary" })}>
          Go to the shop
        </NextLink>
        <a href={accountOrigin()} className={buttonVariants()}>
          Your PPITSZ account
        </a>
      </div>
    </Container>
  )
}
