import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { getSession } from "@ppitsz/accounts/session"
import { safeNext } from "@ppitsz/accounts/urls"
import { SignUpForm } from "@/components/auth-forms"

export const metadata: Metadata = { title: "Sign up" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  await connection()
  const next = safeNext(first((await searchParams).next))
  if (await getSession()) redirect(next)

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">Sign up</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          One account for the PPIT Shenzhen shop, forms and every other PPIT Shenzhen app. The shop asks for your WeChat
          ID when you first order.
        </p>
      </div>
      <Card variant="outline">
        <CardContent>
          <SignUpForm next={next} />
        </CardContent>
      </Card>
      <p className="type-body text-text">
        Already have an account?{" "}
        <NextLink
          href={next === "/" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`}
          className="text-accent-text underline underline-offset-4"
        >
          Sign in
        </NextLink>
      </p>
    </Container>
  )
}
