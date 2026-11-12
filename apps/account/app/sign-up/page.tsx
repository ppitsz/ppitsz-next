import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { googleConfigured, googleError } from "@ppitsz/accounts/google"
import { getSession } from "@ppitsz/accounts/session"
import { safeNext } from "@ppitsz/accounts/urls"
import { SignUpForm } from "@/components/auth-forms"
import { ContinueWithGoogle } from "@/components/google-button"

export const metadata: Metadata = { title: "Sign up" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  await connection()
  const params = await searchParams
  const next = safeNext(first(params.next))
  if (await getSession()) redirect(next)
  const googleProblem = googleError(first(params.google))

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
      {googleProblem && (
        <Alert variant="danger">
          <AlertTitle>Couldn&apos;t continue with Google</AlertTitle>
          <AlertDescription>{googleProblem}</AlertDescription>
        </Alert>
      )}
      <Card variant="outline">
        <CardContent className="flex flex-col gap-6">
          {googleConfigured() && <ContinueWithGoogle next={next} />}
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
