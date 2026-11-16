"use client"

import { startTransition, useActionState, useId, useState } from "react"

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
import { notify } from "@ppitsz/ui/components/sonner"
import type { ActionState } from "@/lib/actions/state"
import { submitProofAction } from "@/lib/actions/buyer"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { needsTransactionDigits } from "@/lib/domain/payment"
import type { PaymentAccount, PaymentMethod } from "@/lib/domain/types"
import { shrinkImage } from "@ppitsz/ui/lib/shrink-image"

const INITIAL: ActionState = {}

/** Where the transaction number is in each app, whatever language it's set to. */
const TRANSACTION_DIGITS_HELP: Partial<Record<PaymentMethod, React.ReactNode>> = {
  wechat: (
    <>
      In WeChat, open this payment in your bills (<span lang="zh-Hans">账单</span>) and find its Transaction ID (
      <span lang="zh-Hans">交易单号</span> or <span lang="zh-Hans">转账单号</span>).
    </>
  ),
  alipay: (
    <>
      In Alipay, open this payment in your bills (<span lang="zh-Hans">账单</span>) and find its Order number (
      <span lang="zh-Hans">订单号</span>).
    </>
  ),
}

/** Pops up when the buyer picks a WeChat Pay or Alipay account, before they pay. */
function remindTransactionDigits(method: PaymentMethod) {
  notify.info(`After paying with ${PAYMENT_METHOD_LABELS[method]}`, {
    description: "Type the last 6 digits of your own payment's transaction number below. Every payment has its own.",
  })
}

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
  const transactionFieldId = useId()
  // With a choice of accounts, the buyer picks one, and the reminder pops up then.
  const [accountId, setAccountId] = useState(accounts.length === 1 ? accounts[0]!.id : "")
  const method = accounts.find((a) => a.id === accountId)?.method

  function chooseAccount(id: string) {
    setAccountId(id)
    const chosen = accounts.find((a) => a.id === id)?.method
    if (chosen && needsTransactionDigits(chosen)) remindTransactionDigits(chosen)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const file = formData.get("proof")
    if (file instanceof File && file.size > 0) {
      // HEIC (iPhone) can't be shown in staff browsers: convert it whatever its size.
      const force = !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      formData.set("proof", await shrinkImage(file, { force }))
    }
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldSet>
        <FieldLegend>Transfer to one of these accounts</FieldLegend>
        <RadioGroup
          name="accountId"
          value={accountId}
          onValueChange={(v) => chooseAccount(String(v))}
          className="gap-3"
        >
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

      {method && needsTransactionDigits(method) && (
        <Field data-invalid={!!state.fieldErrors?.transactionDigits || undefined}>
          <FieldLabel htmlFor={transactionFieldId}>Last 6 digits of the transaction number</FieldLabel>
          <Input
            id={transactionFieldId}
            name="transactionDigits"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            // Room for a whole pasted number: the server keeps its last 6 digits.
            maxLength={60}
            required
            className="max-w-48"
            aria-invalid={!!state.fieldErrors?.transactionDigits || undefined}
            aria-describedby={`${transactionFieldId}-helper`}
          />
          <FieldDescription id={`${transactionFieldId}-helper`}>
            {TRANSACTION_DIGITS_HELP[method]} Type its last 6 digits: we find your transfer by them.
          </FieldDescription>
          {state.fieldErrors?.transactionDigits && <FieldError>{state.fieldErrors.transactionDigits}</FieldError>}
        </Field>
      )}

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
          Our backup. Make sure the amount, time and transfer note are visible.
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
