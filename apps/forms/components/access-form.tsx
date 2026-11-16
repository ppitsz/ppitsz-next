"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import type { ActionState } from "@/lib/actions/state"

const INITIAL: ActionState = {}

/**
 * Getting back to a response by email: the address first, then the 6-digit
 * code the email carries (it also has a direct link). Two steps in one form.
 */
export function AccessForm({
  request,
  verify,
  ticket,
}: {
  request: (state: ActionState, formData: FormData) => Promise<ActionState>
  verify: (state: ActionState, formData: FormData) => Promise<ActionState>
  ticket: boolean
}) {
  const [sent, requestAction, requesting] = useActionState(request, INITIAL)
  const [checked, verifyAction, verifying] = useActionState(verify, INITIAL)
  const email = checked.message ?? sent.message

  if (!email) {
    return (
      <form action={requestAction} noValidate className="flex flex-col gap-6">
        <Field data-invalid={!!sent.fieldErrors?.email || undefined}>
          <FieldLabel htmlFor="email">The email you used</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!sent.fieldErrors?.email || undefined}
            aria-describedby={sent.fieldErrors?.email ? "email-error" : undefined}
          />
          {sent.fieldErrors?.email && <FieldError id="email-error">{sent.fieldErrors.email}</FieldError>}
        </Field>
        {sent.error && (
          <Alert variant="danger" live>
            <AlertDescription>{sent.error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" variant="primary" size="lg" loading={requesting} className="self-start">
          {requesting ? "Sending…" : "Send code"}
        </Button>
      </form>
    )
  }

  return (
    <form action={verifyAction} noValidate className="flex flex-col gap-6">
      <Alert variant="info" live>
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          If {email} responded to this form, we've sent a 6-digit code and a direct link to{" "}
          {ticket ? "your ticket" : "your answers"}. Check your spam folder too.
          {sent.devLink && <span className="block">Emulator: {sent.devLink}</span>}
        </AlertDescription>
      </Alert>
      <input type="hidden" name="email" value={email} />
      <FieldGroup>
        <Field data-invalid={!!checked.fieldErrors?.code || undefined}>
          <FieldLabel htmlFor="code">Code from the email</FieldLabel>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="max-w-48"
            aria-invalid={!!checked.fieldErrors?.code || undefined}
            aria-describedby={checked.fieldErrors?.code ? "code-help code-error" : "code-help"}
          />
          <FieldDescription id="code-help">Works for 15 minutes.</FieldDescription>
          {checked.fieldErrors?.code && <FieldError id="code-error">{checked.fieldErrors.code}</FieldError>}
        </Field>
      </FieldGroup>
      <Button type="submit" variant="primary" size="lg" loading={verifying} className="self-start">
        {verifying ? "Opening…" : "Open"}
      </Button>
    </form>
  )
}
