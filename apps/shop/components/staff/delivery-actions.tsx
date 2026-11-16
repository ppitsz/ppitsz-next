"use client"

import { useActionState, useId, useState, useTransition } from "react"
import { CheckIcon, TruckIcon } from "@phosphor-icons/react"

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
import { Input } from "@ppitsz/ui/components/input"
import { notify } from "@ppitsz/ui/components/sonner"
import { markDeliveredAction, sendByCourierAction } from "@/lib/actions/staff"
import type { ActionState } from "@/lib/actions/state"
import { MAX_COURIER_LENGTH, MAX_TRACKING_LENGTH } from "@/lib/domain/delivery"
import { useShowBuyerMessage } from "./buyer-message"

const COURIERS = ["SF Express 顺丰", "闪送", "JD 京东", "ZTO 中通"]

/**
 * What staff do with a paid delivery order: hand it to a courier with a
 * tracking number, then mark it delivered. A staff member delivering by hand
 * only marks it delivered.
 */
export function DeliveryActions({
  orderId,
  code,
  courier,
}: {
  orderId: string
  code: string
  /** Set once it went out with a courier; sending again corrects it. */
  courier?: { name: string; trackingNumber: string }
}) {
  const [marking, startMark] = useTransition()

  function markDelivered() {
    startMark(async () => {
      const result = await markDeliveredAction(orderId)
      if (result.error) notify.danger(result.error)
      else notify.success(`${code} delivered.`)
    })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button loading={marking} onClick={markDelivered}>
        <CheckIcon aria-hidden weight="bold" />
        {marking ? "Saving…" : "Mark delivered"}
      </Button>
      <CourierDialog orderId={orderId} code={code} courier={courier} />
    </div>
  )
}

function CourierDialog({
  orderId,
  code,
  courier,
}: {
  orderId: string
  code: string
  courier?: { name: string; trackingNumber: string }
}) {
  const id = useId()
  const showBuyerMessage = useShowBuyerMessage()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(courier?.name ?? "")
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await sendByCourierAction(orderId, prev, formData)
    if (result.done) {
      setOpen(false)
      notify.success(`Tracking number for ${code} saved.`)
      if (result.buyerMessage) showBuyerMessage(result.buyerMessage)
    }
    return result
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="quiet" />}>
        <TruckIcon aria-hidden />
        {courier ? "Edit tracking" : "Send by courier"}
      </DialogTrigger>
      <DialogContent size="sm">
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Send {code} by courier</DialogTitle>
            <DialogDescription>
              Book the courier in its app first, then record the tracking number here. The buyer sees it on their
              order page.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor={`${id}-courier`}>Courier</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {COURIERS.map((c) => (
                <Button key={c} type="button" size="sm" variant="quiet" onClick={() => setName(c)}>
                  {c}
                </Button>
              ))}
            </div>
            <Input
              id={`${id}-courier`}
              name="courier"
              value={name}
              maxLength={MAX_COURIER_LENGTH}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field data-invalid={!!state.fieldErrors?.trackingNumber || undefined}>
            <FieldLabel htmlFor={`${id}-tracking`}>Tracking number</FieldLabel>
            <Input
              id={`${id}-tracking`}
              name="trackingNumber"
              defaultValue={courier?.trackingNumber}
              maxLength={MAX_TRACKING_LENGTH}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!state.fieldErrors?.trackingNumber || undefined}
              aria-describedby={`${id}-tracking-helper`}
            />
            <FieldDescription id={`${id}-tracking-helper`}>Once saved, a WeChat message is ready to send.</FieldDescription>
            {state.fieldErrors?.trackingNumber && <FieldError>{state.fieldErrors.trackingNumber}</FieldError>}
          </Field>

          {state.error && (
            <Alert variant="danger" live>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" variant="primary" loading={pending}>
              {pending ? "Saving…" : "Save tracking number"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
