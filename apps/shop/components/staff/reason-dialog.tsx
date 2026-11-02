"use client"

import { useActionState, useId, useState } from "react"

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
import { Field, FieldDescription, FieldError, FieldLabel } from "@ppitsz/ui/components/field"
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import type { ActionState } from "@/lib/actions/state"
import { useShowBuyerMessage } from "./buyer-message"

/**
 * A danger action that needs a reason the buyer will read: rejecting a proof,
 * canceling an order. Common reasons are one tap away. A message for the
 * buyer that the action returns opens in the dashboard's message dialog.
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  successMessage,
  presets,
  action,
}: {
  trigger: string
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  successMessage: string
  presets: string[]
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
}) {
  const id = useId()
  const showBuyerMessage = useShowBuyerMessage()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData)
    if (result.done) {
      setOpen(false)
      setReason("")
      notify.success(successMessage)
      if (result.buyerMessage) showBuyerMessage(result.buyerMessage)
    }
    return result
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="danger" />}>{trigger}</DialogTrigger>
      <DialogContent size="sm">
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!state.fieldErrors?.reason || undefined}>
            <FieldLabel htmlFor={`${id}-reason`}>Alasan</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button key={preset} type="button" size="sm" variant="quiet" onClick={() => setReason(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
            <Textarea
              id={`${id}-reason`}
              name="reason"
              rows={3}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!state.fieldErrors?.reason || undefined}
              aria-describedby={`${id}-helper`}
            />
            <FieldDescription id={`${id}-helper`}>Shown to the buyer on their order page.</FieldDescription>
            {state.fieldErrors?.reason && <FieldError>{state.fieldErrors.reason}</FieldError>}
          </Field>

          {state.error && (
            <Alert variant="danger" live>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" variant="danger" loading={pending}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
