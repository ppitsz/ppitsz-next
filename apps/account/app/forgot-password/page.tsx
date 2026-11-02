import type { Metadata } from "next"

import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Container } from "@ppitsz/ui/components/container"
import { ForgotPasswordForm } from "@/components/auth-forms"

export const metadata: Metadata = { title: "Forgot password" }

export default function ForgotPasswordPage() {
  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">Set a new password</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          We email you a link to set a new password. It changes the password of your one account, for every app.
        </p>
      </div>
      <Card variant="outline">
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </Container>
  )
}
