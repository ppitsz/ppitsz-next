"use client"

import { startTransition, useActionState, useId } from "react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import type { ActionState } from "@/lib/actions/state"
import { submitProofAction } from "@/lib/actions/buyer"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import type { PaymentAccount } from "@/lib/domain/types"
import { shrinkImage } from "@/lib/client/shrink-image"

const INITIAL: ActionState = {}

export function ProofForm({
  token,
  accounts,
}: {
  token: string
  /** With qrImageUrl resolved for display. */
  accounts: (PaymentAccount & { qrImageUrl?: string })[]
}) {
  const [state, action, pending] = useActionState(submitProofAction.bind(null, token), INITIAL)
  const fileId = useId()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const file = formData.get("proof")
    if (file instanceof File && file.size > 0) {
      // HEIC (iPhone) can't be shown in Danus's browsers: convert it whatever its size.
      const force = !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      formData.set("proof", await shrinkImage(file, { force }))
    }
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldSet>
        <FieldLegend>Transfer to one of these accounts</FieldLegend>
        <RadioGroup name="accountId" defaultValue={accounts[0]?.id} className="gap-3">
          {accounts.map((account) => (
            <FieldLabel key={account.id} htmlFor={`pay-${account.id}`}>
              <Field orientation="horizontal">
                <RadioGroupItem value={account.id} id={`pay-${account.id}`} />
                <FieldContent>
                  <span className="type-ui text-text">{PAYMENT_METHOD_LABELS[account.method]}</span>
                  <span className="type-body-sm text-text">{account.holder}</span>
                  <span className="type-body-sm text-muted">{account.detail}</span>
                  {account.qrImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- served by /media
                    <img
                      src={account.qrImageUrl}
                      alt={`QR ${PAYMENT_METHOD_LABELS[account.method]} ${account.holder}`}
                      className="mt-2 w-full max-w-56 rounded-lg"
                    />
                  )}
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        {state.fieldErrors?.accountId && <FieldError>{state.fieldErrors.accountId}</FieldError>}
      </FieldSet>

      <Field data-invalid={!!state.fieldErrors?.proof || undefined}>
        <FieldLabel htmlFor={fileId}>Screenshot of your transfer</FieldLabel>
        <Input
          id={fileId}
          name="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          aria-invalid={!!state.fieldErrors?.proof || undefined}
          aria-describedby={`${fileId}-helper`}
          className="h-auto py-2"
        />
        <FieldDescription id={`${fileId}-helper`}>
          Make sure the amount, time and transfer note are visible.
        </FieldDescription>
        {state.fieldErrors?.proof && <FieldError>{state.fieldErrors.proof}</FieldError>}
      </Field>

      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Proof not sent</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {pending ? "Sending…" : "Send proof of payment"}
      </Button>
    </form>
  )
}
