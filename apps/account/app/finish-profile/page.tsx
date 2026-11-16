import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { isProfileComplete } from "@ppitsz/accounts/fields"
import { profileOrBlank } from "@ppitsz/accounts/profile"
import { safeNext } from "@ppitsz/accounts/urls"
import { FinishProfileForm } from "@/components/auth-forms"
import { requireSession } from "@/lib/server/auth"
import { profileValues } from "@/lib/profile-values"

export const metadata: Metadata = { title: "A few more details" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** After a sign-in that came without what sign-up asks for: a new Google sign-in, or a staff account made by a script. */
export default async function FinishProfilePage({ searchParams }: PageProps<"/finish-profile">) {
  await connection()
  const params = await searchParams
  const next = safeNext(first(params.next))
  const session = await requireSession(next === "/" ? "/finish-profile" : `/finish-profile?next=${encodeURIComponent(next)}`)
  const profile = await profileOrBlank(session)
  if (isProfileComplete(profile)) redirect(next)

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">A few more details</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          We ask everyone for their birthday and intake year. You only do this once, then you&apos;re on your way.
        </p>
      </div>
      <Card variant="outline">
        <CardContent className="flex flex-col gap-6">
          <FinishProfileForm next={next} profile={profileValues(profile)} />
        </CardContent>
      </Card>
    </Container>
  )
}
