"use client"

import { useActionState, useState, useTransition } from "react"
import { EnvelopeSimpleIcon } from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ppitsz/ui/components/alert-dialog"
import { Button } from "@ppitsz/ui/components/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import type { ActionState } from "@/lib/actions/state"
import {
  cancelResponseAction,
  checkInByIdAction,
  editResponseAction,
  resendEmailAction,
  undoCheckInAction,
} from "@/lib/actions/staff"
import type { Identity } from "@/lib/domain/types"
import { CAMPUS_OPTIONS } from "@/lib/labels"

const INITIAL: ActionState = {}

function useToastAction() {
  const [pending, start] = useTransition()
  const run = (task: () => Promise<ActionState>, success?: string) =>
    start(async () => {
      const result = await task()
      if (result.error) notify.danger(result.error)
      else notify.success(result.message ?? success ?? "Saved.")
    })
  return [pending, run] as const
}

/** Organizers fix who the ticket is for, its email and its type. A changed email gets the ticket again. */
export function EditResponseForm({
  formId,
  responseId,
  identity,
  ask,
  ticketTypeId,
  types,
}: {
  formId: string
  responseId: string
  identity: Identity
  ask: { email: boolean; contact: boolean }
  ticketTypeId: string | null
  types: { id: string; name: string }[] | null
}) {
  const [state, action, pending] = useActionState(editResponseAction.bind(null, formId, responseId), INITIAL)
  const [lastDone, setLastDone] = useState(state.done)
  if (state.done !== lastDone) {
    setLastDone(state.done)
    if (state.message) notify.success(state.message)
  }
  const err = (k: string) => state.fieldErrors?.[k]
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        {ask.email && (
          <>
            <Field data-invalid={!!err("name") || undefined}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" defaultValue={identity.name} aria-invalid={!!err("name") || undefined} />
              <FieldDescription>For a ticket passed on to someone else, change the name here.</FieldDescription>
              {err("name") && <FieldError>{err("name")}</FieldError>}
            </Field>
            <Field data-invalid={!!err("email") || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" defaultValue={identity.email} aria-invalid={!!err("email") || undefined} />
              <FieldDescription>If you change it, the ticket is sent again to the new address.</FieldDescription>
              {err("email") && <FieldError>{err("email")}</FieldError>}
            </Field>
          </>
        )}
        {ask.contact && (
          <>
            <Field data-invalid={!!err("wechatId") || undefined}>
              <FieldLabel htmlFor="wechat">ID WeChat</FieldLabel>
              <Input id="wechat" name="wechatId" defaultValue={identity.wechatId} aria-invalid={!!err("wechatId") || undefined} />
              {err("wechatId") && <FieldError>{err("wechatId")}</FieldError>}
            </Field>
            <Field data-invalid={!!err("campus") || undefined}>
              <FieldLabel htmlFor="campus">Campus</FieldLabel>
              <NativeSelect id="campus" name="campus" defaultValue={identity.campus} aria-invalid={!!err("campus") || undefined}>
                <NativeSelectOption value="">Choose a campus</NativeSelectOption>
                {CAMPUS_OPTIONS.map((c) => (
                  <NativeSelectOption key={c.value} value={c.value}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {err("campus") && <FieldError>{err("campus")}</FieldError>}
            </Field>
          </>
        )}
        {types && (
          <Field>
            <FieldLabel htmlFor="type">Ticket type</FieldLabel>
            <NativeSelect id="type" name="ticketTypeId" defaultValue={ticketTypeId ?? ""}>
              {types.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>Moving to another type still follows that type's quota.</FieldDescription>
          </Field>
        )}
      </FieldGroup>
      {state.error && <p className="type-body-sm text-danger-text">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}

export function ResendEmailButton({ formId, responseId }: { formId: string; responseId: string }) {
  const [pending, run] = useToastAction()
  return (
    <Button loading={pending} onClick={() => run(() => resendEmailAction(formId, responseId))}>
      <EnvelopeSimpleIcon aria-hidden />
      {pending ? "Sending…" : "Send email again"}
    </Button>
  )
}

export function CheckInButton({
  formId,
  responseId,
  dayId,
  checkedIn,
}: {
  formId: string
  responseId: string
  dayId: string
  checkedIn: boolean
}) {
  const [pending, run] = useToastAction()
  return checkedIn ? (
    <Button size="sm" variant="quiet" loading={pending} onClick={() => run(() => undoCheckInAction(formId, responseId, dayId), "Check-in undone.")}>
      Undo check-in
    </Button>
  ) : (
    <Button size="sm" loading={pending} onClick={() => run(() => checkInByIdAction(formId, responseId, dayId))}>
      Check in
    </Button>
  )
}

export function CancelResponseButton({ formId, responseId, ticket }: { formId: string; responseId: string; ticket: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="danger" />}>{ticket ? "Cancel ticket" : "Cancel response"}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ticket ? "Cancel this ticket?" : "Cancel this response?"}</AlertDialogTitle>
          <AlertDialogDescription>
            The place goes back to the quota and the email can sign up again. {ticket && "Its QR code stops working. "}This can't
            be undone; the holder isn't told automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await cancelResponseAction(formId, responseId)
                if (result.error) notify.danger(result.error)
                else {
                  notify.success("Canceled.")
                  setOpen(false)
                }
              })
            }
          >
            {pending ? "Canceling…" : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
