"use client"

import { useActionState, useState, useTransition } from "react"
import { CopyIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@ppitsz/ui/components/field"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { copyFormAction, coverAction, setStatusAction } from "@/lib/actions/admin"
import type { ActionState } from "@/lib/actions/state"
import { shrinkImage } from "@ppitsz/ui/lib/shrink-image"
import type { FormStatus } from "@/lib/domain/types"

const INITIAL: ActionState = {}

const STATUS_HELP: Record<FormStatus, string> = {
  draft: "Only the organizers can open it, as a preview.",
  open: "Takes responses (within its open and close dates), and shows on the home page unless it's hidden.",
  closed: "Takes no new responses. Tickets stay valid and can still be scanned.",
  done: "Archived: the organizers can't open it anymore, and 90 days later personal data is deleted.",
}

const STATUS_LABELS: Record<FormStatus, string> = { draft: "Draft", open: "Open", closed: "Closed", done: "Ended" }

export function StatusControl({ formId, status }: { formId: string; status: FormStatus }) {
  const [value, setValue] = useState(status)
  const [pending, start] = useTransition()
  return (
    <Field>
      <FieldLabel htmlFor="status">Status</FieldLabel>
      <div className="flex flex-wrap gap-3">
        <NativeSelect id="status" value={value} onChange={(e) => setValue(e.target.value as FormStatus)} aria-describedby="status-help">
          {(Object.keys(STATUS_LABELS) as FormStatus[]).map((s) => (
            <NativeSelectOption key={s} value={s}>
              {STATUS_LABELS[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          loading={pending}
          disabled={value === status}
          onClick={() =>
            start(async () => {
              const result = await setStatusAction(formId, value)
              if (result.error) notify.danger(result.error)
              else notify.success(`Status: ${STATUS_LABELS[value]}.`)
            })
          }
        >
          {pending ? "Saving…" : "Save status"}
        </Button>
      </div>
      <FieldDescription id="status-help">{STATUS_HELP[value]}</FieldDescription>
    </Field>
  )
}

/** The cover photo, shrunk in the browser to 1600 px before upload. */
export function CoverForm({ formId, hasCover }: { formId: string; hasCover: boolean }) {
  const [state, action, pending] = useActionState(coverAction.bind(null, formId), INITIAL)
  const [shrinking, setShrinking] = useState(false)

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setShrinking(true)
    const small = await shrinkImage(file, { maxSide: 1600, force: true })
    const transfer = new DataTransfer()
    transfer.items.add(small)
    input.files = transfer.files
    setShrinking(false)
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Field data-invalid={!!state.fieldErrors?.cover || undefined}>
        <FieldLabel htmlFor="cover">Cover photo</FieldLabel>
        <input
          id="cover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="type-body-sm text-text file:me-3 file:h-11 file:rounded-full file:border-2 file:border-text file:bg-transparent file:px-5 file:type-ui file:text-text hover:file:bg-surface-strong"
        />
        <FieldDescription>A 3:2 ratio, like 1500 × 1000. Shown on the form and tickets.</FieldDescription>
        {state.fieldErrors?.cover && <FieldError>{state.fieldErrors.cover}</FieldError>}
        {state.error && <FieldError>{state.error}</FieldError>}
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending || shrinking}>
          {shrinking ? "Shrinking…" : pending ? "Uploading…" : "Upload cover"}
        </Button>
        {hasCover && (
          <Button type="submit" name="remove" value="1" variant="quiet">
            Remove cover
          </Button>
        )}
      </div>
    </form>
  )
}

export function CopyFormButton({ formId }: { formId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await copyFormAction(formId)
          if (result?.error) notify.danger(result.error)
        })
      }
    >
      <CopyIcon aria-hidden />
      {pending ? "Duplicating…" : "Duplicate form"}
    </Button>
  )
}

export function CopyLinkButton({ url }: { url: string }) {
  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          notify.success("Link copied.")
        } catch {
          notify.danger("Couldn't copy. Select the link and copy it yourself.")
        }
      }}
    >
      <CopyIcon aria-hidden />
      Copy link
    </Button>
  )
}
