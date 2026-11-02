import type { Metadata } from "next"
import { connection } from "next/server"

import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { requirePortalAdmin } from "@/lib/server/auth"
import { AddPersonForm } from "@/components/accounts"

export const metadata: Metadata = { title: "Add person" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function AddPersonPage({ searchParams }: PageProps<"/accounts/new">) {
  await connection()
  await requirePortalAdmin("/accounts/new")
  const email = first((await searchParams).email)

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">Portal admin</p>
        <h1 className="type-display-xl text-text">Add person</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          If the email has no account yet, one is made with a password you send them on WeChat. An existing account keeps
          its password.
        </p>
      </div>
      <Card variant="outline">
        <CardContent>
          <AddPersonForm email={email} />
        </CardContent>
      </Card>
    </Container>
  )
}
