"use client"

import { useActionState, useId, useState, useTransition } from "react"
import { CheckIcon, LinkIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
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
import { Textarea } from "@ppitsz/ui/components/textarea"
import { approveAction, cancelAction, refundAction, rejectAction } from "@/lib/actions/staff"
import type { ActionState } from "@/lib/actions/state"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import type { PaymentMethod } from "@/lib/domain/types"
import { orderPath } from "@/lib/order-path"
import { ReasonDialog } from "./reason-dialog"

/** Approve or reject a payment proof. */
export function ReviewActions({
  orderId,
  code,
  primary = false,
}: {
  orderId: string
  code: string
  /** The red button, when this is the screen's one main action. */
  primary?: boolean
}) {
  const [approving, startApprove] = useTransition()

  function approve() {
    startApprove(async () => {
      const result = await approveAction(orderId)
      if (result.error) notify.danger(result.error)
      else notify.success(`${code} approved. The buyer sees it on their order page.`)
    })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant={primary ? "primary" : "secondary"} loading={approving} onClick={approve}>
        <CheckIcon aria-hidden weight="bold" />
        {approving ? "Approving…" : "Approve payment"}
      </Button>
      <ReasonDialog
        trigger="Reject"
        title={`Reject the proof for ${code}?`}
        description="The order goes back to payment, and the buyer gets a new deadline to send the right proof."
        confirmLabel="Reject proof"
        pendingLabel="Rejecting…"
        successMessage={`Proof for ${code} rejected. The buyer can send it again.`}
        presets={[
          "The amount doesn't match",
          "The transfer hasn't come in",
          "The proof can't be read",
          "This isn't a transfer proof",
        ]}
        action={rejectAction.bind(null, orderId)}
      />
    </div>
  )
}

/** Cancel an open order. The money goes back outside the app; RefundButton records it. */
export function CancelOrderButton({ orderId, code }: { orderId: string; code: string }) {
  return (
    <ReasonDialog
      trigger="Cancel order"
      title={`Cancel ${code}?`}
      description="Stock not handed over becomes available again. If the buyer paid, refund them by WeChat, Alipay or bank, then record it on this page."
      confirmLabel="Cancel order"
      pendingLabel="Canceling…"
      successMessage={`${code} canceled.`}
      presets={["The buyer asked", "Sold out", "Duplicate order"]}
      action={cancelAction.bind(null, orderId)}
    />
  )
}

const REFUND_METHODS: PaymentMethod[] = ["wechat", "alipay", "bank", "cash"]

/** Records the money sent back for a canceled or expired online order. */
export function RefundButton({
  orderId,
  code,
  dueFen,
  method,
}: {
  orderId: string
  code: string
  /** What should go back, to start the amount with. */
  dueFen: number
  /** How the buyer paid, to start the choice with. */
  method?: PaymentMethod
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await refundAction(orderId, prev, formData)
    if (result.done) {
      setOpen(false)
      notify.success(`Refund for ${code} recorded.`)
    }
    return result
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        Record refund
      </DialogTrigger>
      <DialogContent size="sm">
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Record a refund for {code}</DialogTitle>
            <DialogDescription>
              Send the money in its app first, then record it here. This record can't be changed.
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!state.fieldErrors?.amount || undefined}>
            <FieldLabel htmlFor={`${id}-amount`}>Amount (¥)</FieldLabel>
            <Input
              id={`${id}-amount`}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={dueFen > 0 ? String(dueFen / 100) : ""}
              className="max-w-40"
              aria-invalid={!!state.fieldErrors?.amount || undefined}
              aria-describedby={`${id}-amount-helper`}
            />
            <FieldDescription id={`${id}-amount-helper`}>
              Filled with the price of the items not handed over, plus any unused delivery fee. Change it if you sent a different amount.
            </FieldDescription>
            {state.fieldErrors?.amount && <FieldError>{state.fieldErrors.amount}</FieldError>}
          </Field>

          <FieldSet data-invalid={!!state.fieldErrors?.method || undefined}>
            <FieldLegend variant="label">Refunded via</FieldLegend>
            <RadioGroup name="method" defaultValue={method ?? "wechat"} className="gap-3">
              {REFUND_METHODS.map((m) => (
                <FieldLabel key={m} htmlFor={`${id}-${m}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value={m} id={`${id}-${m}`} />
                    <FieldContent>
                      <span className="type-ui text-text">{PAYMENT_METHOD_LABELS[m]}</span>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            {state.fieldErrors?.method && <FieldError>{state.fieldErrors.method}</FieldError>}
          </FieldSet>

          <Field>
            <FieldLabel htmlFor={`${id}-note`}>Note</FieldLabel>
            <Textarea id={`${id}-note`} name="note" rows={2} maxLength={200} aria-describedby={`${id}-note-helper`} />
            <FieldDescription id={`${id}-note-helper`}>
              Optional: to which account, the transaction number, or why the amount differs.
            </FieldDescription>
          </Field>

          {state.error && (
            <Alert variant="danger" live>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" variant="primary" loading={pending}>
              {pending ? "Mencatat…" : "Catat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Copies the buyer's order link, to send them over WeChat. */
export function CopyBuyerLink({ token }: { token: string }) {
  async function copy() {
    const url = `${window.location.origin}${orderPath(token)}`
    try {
      await navigator.clipboard.writeText(url)
      notify.success("Order link copied. Send it to the buyer on WeChat.")
    } catch {
      window.prompt("Copy this link:", url)
    }
  }
  return (
    <Button variant="quiet" onClick={copy}>
      <LinkIcon aria-hidden />
      Copy buyer link
    </Button>
  )
}
