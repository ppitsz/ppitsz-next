import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { checkResetCode } from "@ppitsz/accounts/passwords"
import { ResetPasswordForm } from "@/components/auth-forms"

// The reset code is in the URL: never send it on as a referrer.
export const metadata: Metadata = { title: "New password", referrer: "no-referrer" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Opened from the emailed link, or from a panitia invite to set a first password. */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  await connection()
  const params = await searchParams
  // Our own links carry `code`; Firebase's email (no Resend) carries `oobCode`.
  const code = first(params.code) ?? first(params.oobCode) ?? ""
  const email = code ? await checkResetCode(code).catch(() => null) : null

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">New password</h1>
        {email && <p className="max-w-[66ch] type-lede text-muted">For {email}.</p>}
      </div>
      {email ? (
        <Card variant="outline">
          <CardContent>
            <ResetPasswordForm code={code} />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="danger">
          <AlertTitle>This link doesn&apos;t work anymore</AlertTitle>
          <AlertDescription>
            It has expired or has been used. <NextLink href="/forgot-password">Ask for a new link</NextLink>
          </AlertDescription>
        </Alert>
      )}
    </Container>
  )
}
