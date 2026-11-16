"use client"

import { useActionState, useState, useTransition } from "react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { addMemberAction, broadcastAction, removeMemberAction } from "@/lib/actions/admin"
import type { ActionState } from "@/lib/actions/state"

const INITIAL: ActionState = {}

/** Say so once per success; the form resets itself. */
function useDone(state: ActionState) {
  const [last, setLast] = useState(state.done)
  if (state.done !== last) {
    setLast(state.done)
    if (state.done && state.message) notify.success(state.message)
  }
}

export function AddMemberForm({ formId }: { formId: string }) {
  const [state, action, pending] = useActionState(addMemberAction.bind(null, formId), INITIAL)
  useDone(state)
  const err = (k: string) => state.fieldErrors?.[k]
  return (
    <form action={action} noValidate className="flex flex-col gap-6" key={state.done}>
      <FieldGroup>
        <Field data-invalid={!!err("name") || undefined}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="off" aria-invalid={!!err("name") || undefined} />
          {err("name") && <FieldError>{err("name")}</FieldError>}
        </Field>
        <Field data-invalid={!!err("email") || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="off" aria-invalid={!!err("email") || undefined} />
          <FieldDescription>Anyone without an account gets an email to set a password.</FieldDescription>
          {err("email") && <FieldError>{err("email")}</FieldError>}
        </Field>
      </FieldGroup>
      {state.error && <p className="type-body-sm text-danger-text">{state.error}</p>}
      {state.devLink && (
        <p className="type-caption text-muted">
          Emulator: <a href={state.devLink} className="underline underline-offset-4">the link from the invite email</a>
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Adding…" : "Add organizer"}
      </Button>
    </form>
  )
}

export function RemoveMemberButton({ formId, uid, name }: { formId: string; uid: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="quiet"
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await removeMemberAction(formId, uid)
          if (result.error) notify.danger(result.error)
          else notify.success(`${name} is no longer an organizer of this form.`)
        })
      }
    >
      Keluarkan
    </Button>
  )
}

/** A change for every ticket holder, or the cancellation of the whole event. */
export function BroadcastForm({ formId, title, recipients }: { formId: string; title: string; recipients: number }) {
  const [state, action, pending] = useActionState(broadcastAction.bind(null, formId), INITIAL)
  const [kind, setKind] = useState<"change" | "cancel">("change")
  useDone(state)
  const cancel = kind === "cancel"
  return (
    <form action={action} noValidate className="flex flex-col gap-6" key={state.done}>
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label="Announcement type" className="flex flex-wrap gap-2">
        {(["change", "cancel"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className="inline-flex h-11 items-center rounded-full border border-border-strong px-4 type-ui text-text hover:bg-surface-strong aria-checked:border-text aria-checked:bg-surface-strong"
          >
            {k === "change" ? "A change" : "Cancel the event"}
          </button>
        ))}
      </div>
      {cancel && (
        <Alert variant="danger">
          <AlertTitle>This cancels the event</AlertTitle>
          <AlertDescription>
            The form closes, all {recipients} tickets stop working and are refused at the scanner, then this announcement goes
            to their holders. This can't be undone.
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="subject">Judul</FieldLabel>
          <Input id="subject" name="subject" maxLength={120} placeholder={cancel ? "Event canceled" : "Venue moved to Hall B"} />
        </Field>
        <Field>
          <FieldLabel htmlFor="body">Announcement</FieldLabel>
          <Textarea id="body" name="body" rows={7} maxLength={5000} />
          <FieldDescription>Sent as written. Each holder's ticket link is added below it.</FieldDescription>
        </Field>
        {cancel && (
          <Field data-invalid={!!state.fieldErrors?.confirm || undefined}>
            <FieldLabel htmlFor="confirm">Type the form's title to confirm</FieldLabel>
            <Input id="confirm" name="confirm" autoComplete="off" placeholder={title} />
            {state.fieldErrors?.confirm && <FieldError>{state.fieldErrors.confirm}</FieldError>}
          </Field>
        )}
      </FieldGroup>
      {state.error && <p className="type-body-sm text-danger-text">{state.error}</p>}
      <Button type="submit" variant={cancel ? "danger" : "primary"} loading={pending} className="self-start">
        {pending ? "Sending…" : cancel ? "Cancel the event and send" : `Send to ${recipients} ticket ${recipients === 1 ? "holder" : "holders"}`}
      </Button>
    </form>
  )
}
