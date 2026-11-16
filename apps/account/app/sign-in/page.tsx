import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { googleConfigured, googleError } from "@ppitsz/accounts/google"
import { getSession } from "@ppitsz/accounts/session"
import { formsOrigin, safeNext, shopOrigin, siteOrigin } from "@ppitsz/accounts/urls"
import { SignInForm } from "@/components/auth-forms"
import { ContinueWithGoogle } from "@/components/google-button"
import { afterSignIn } from "@/lib/server/auth"

export const metadata: Metadata = { title: "Sign in" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Where `next` leads, in words, so people know why they're here. */
function purpose(next: string) {
  if (next.startsWith(`${shopOrigin()}/staff`)) return "Sign in to the Shop dashboard."
  if (next.startsWith(shopOrigin()) && next.endsWith("/checkout")) return "Sign in to order. Your cart stays saved on this phone."
  if (next.startsWith(shopOrigin())) return "Sign in to order and follow your orders."
  if (next.startsWith(`${formsOrigin()}/staff`)) return "Sign in to the Forms dashboard."
  if (next.startsWith(formsOrigin())) return "Sign in, and your name and email are filled in for you."
  if (next.startsWith(siteOrigin())) return "Sign in to fill in our forms and sign up for our events."
  return "One account for the PPIT Shenzhen shop, forms and every other PPIT Shenzhen app."
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  await connection()
  const params = await searchParams
  const next = safeNext(first(params.next))
  const session = await getSession()
  if (session) redirect(await afterSignIn(session.uid, next))
  const googleProblem = googleError(first(params.google))

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">Sign in</h1>
        <p className="max-w-[66ch] type-lede text-muted">{purpose(next)}</p>
      </div>

      {first(params.reset) === "1" && (
        <Alert variant="success">
          <AlertTitle>Password changed</AlertTitle>
          <AlertDescription>Sign in with your new password.</AlertDescription>
        </Alert>
      )}
      {googleProblem && (
        <Alert variant="danger">
          <AlertTitle>Couldn&apos;t continue with Google</AlertTitle>
          <AlertDescription>{googleProblem}</AlertDescription>
        </Alert>
      )}
      <Card variant="outline">
        <CardContent className="flex flex-col gap-6">
          {googleConfigured() && <ContinueWithGoogle next={next} />}
          <SignInForm next={next} email={first(params.email)} />
        </CardContent>
      </Card>
      <p className="type-body text-text">
        No account yet?{" "}
        <NextLink
          href={next === "/" ? "/sign-up" : `/sign-up?next=${encodeURIComponent(next)}`}
          className="text-accent-text underline underline-offset-4"
        >
          Sign up
        </NextLink>
        , once for every PPIT Shenzhen app.
      </p>
    </Container>
  )
}
