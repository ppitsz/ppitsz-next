"use client"

import { useActionState } from "react"

import { Button } from "@ppitsz/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ppitsz/ui/components/card"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { createFormAction } from "@/lib/actions/admin"
import type { ActionState } from "@/lib/actions/state"

const INITIAL: ActionState = {}

/** A new draft form; the builder opens next. */
export function CreateForm() {
  const [state, action, pending] = useActionState(createFormAction, INITIAL)
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Create a form</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} noValidate className="flex flex-col gap-6">
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.title || undefined}>
              <FieldLabel htmlFor="subject">Judul</FieldLabel>
              <Input id="subject" name="title" maxLength={120} aria-invalid={!!state.fieldErrors?.title || undefined} />
              {state.fieldErrors?.title && <FieldError>{state.fieldErrors.title}</FieldError>}
            </Field>
            <FieldLabel htmlFor="use-tickets">
              <Field orientation="horizontal">
                <Checkbox id="use-tickets" name="tickets" />
                <FieldContent>
                  <span className="type-ui text-text">Use tickets</span>
                  <FieldDescription>For events: ticket types, quotas, QR codes and check-in. You can change this later.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          </FieldGroup>
          {state.error && <p className="type-body-sm text-danger-text">{state.error}</p>}
          <Button type="submit" loading={pending} className="self-start">
            {pending ? "Creating…" : "Create draft"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
