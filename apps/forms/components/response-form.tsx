"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { Textarea } from "@ppitsz/ui/components/textarea"
import type { LineCode } from "@ppitsz/ui/lib/network"
import type { ActionState } from "@/lib/actions/state"
import { shrinkImage } from "@ppitsz/ui/lib/shrink-image"
import { FILE_ACCEPT } from "@/lib/domain/files"
import { checkAnswers, checkIdentity, LIMITS, visibleQuestions, type AnswerInput } from "@/lib/domain/form"
import type { Identity, Question, Section } from "@/lib/domain/types"
import { CAMPUS_OPTIONS } from "@/lib/labels"

/*
 * The responder's form: the fixed fields and ticket type on the first page,
 * then one page per section, with questions and sections shown or hidden as
 * earlier choices change. With several pages, a strip map runs above them
 * to the form's end: the ticket, or the answers sent. Every page stays in the DOM (hidden), so one
 * submit sends everything. The server checks it all again.
 */

export interface TicketChoice {
  id: string
  name: string
  description: string
  days: string
  /** Why it can't be picked, or null when on sale. */
  unavailable: string | null
  note: string
}

export interface ResponseFormProps {
  mode: "new" | "edit"
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  sections: Section[]
  line: LineCode
  ask: { email: boolean; contact: boolean }
  ticketTypes: TicketChoice[] | null
  /** The response being edited, or, for a new one, the signed-in account's details to start from. */
  initial?: {
    identity: Identity
    /** Text and choice answers. */
    values: Record<string, string | string[]>
    /** Stored file names, by question id. */
    files: Record<string, string>
  }
  submitLabel: string
}

const INITIAL: ActionState = {}
/** What one request may carry (Vercel's limit is 4.5 MB). */
const MAX_TOTAL_BYTES = 4.3 * 1024 * 1024
const IDENTITY_FIELDS = ["ticketTypeId", "name", "email", "wechatId", "campus"]
const FIELD_NAMES: Record<string, string> = {
  ticketTypeId: "Ticket type",
  name: "Name",
  email: "Email",
  wechatId: "ID WeChat",
  campus: "Campus",
}

const fieldId = (key: string) => (IDENTITY_FIELDS.includes(key) ? `f-${key}` : `q-${key}`)

export function ResponseForm(props: ResponseFormProps) {
  const { mode, sections, ask, ticketTypes, initial } = props
  const [state, action, pending] = useActionState(props.action, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  // Choices drive the conditions, so they are state; text fields keep their own value.
  const [choices, setChoices] = useState<Record<string, string | string[]>>(() => {
    const values = initial?.values ?? {}
    return Object.fromEntries(
      sections.flatMap((s) => s.questions).flatMap((q) => (values[q.id] !== undefined && (q.type === "single" || q.type === "multi") ? [[q.id, values[q.id]!]] : []))
    )
  })
  const pages = useMemo(() => visibleQuestions(sections, choices), [sections, choices])
  const [page, setPage] = useState(0)
  const current = Math.min(page, pages.length - 1)
  const last = current === pages.length - 1

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [serverErrors, setServerErrors] = useState<ActionState>(INITIAL)
  const [lastState, setLastState] = useState(state)
  // A new server answer replaces what the page found itself.
  if (state !== lastState) {
    setLastState(state)
    setServerErrors(state)
    setLocalErrors({})
  }
  const errors = { ...serverErrors.fieldErrors, ...localErrors } as Record<string, string>

  // After a refused submit, go to the first page with an error and read out the summary.
  useEffect(() => {
    if (!state.fieldErrors && !state.error) return
    const keys = Object.keys(state.fieldErrors ?? {})
    const index = pages.findIndex(({ questions }, i) =>
      keys.some((k) => questions.some((q) => q.id === k) || (i === 0 && IDENTITY_FIELDS.includes(k)))
    )
    if (index >= 0) setPage(index)
    queueMicrotask(() => summaryRef.current?.focus())
    // Only on a new server answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  /** Checks the current page in the browser before moving on. */
  function checkPage() {
    const data = new FormData(formRef.current!)
    const input: AnswerInput = { values: {}, files: {} }
    for (const q of pages[current]!.questions) {
      if (q.type === "file") {
        const file = data.get(`f:${q.id}`)
        if (file instanceof File && file.size > 0) input.files[q.id] = { name: file.name, size: file.size, contentType: file.type }
      } else input.values[q.id] = q.type === "multi" ? data.getAll(`q:${q.id}`).map(String) : String(data.get(`q:${q.id}`) ?? "")
    }
    const onPage = new Set(pages[current]!.questions.map((q) => q.id))
    // Answers already stored count as answered (an unchanged file in an edit).
    const previous = Object.fromEntries(Object.keys(initial?.files ?? {}).map((id) => [id, { path: "x", name: "", contentType: "", size: 0 }]))
    const found: Record<string, string> = {}
    // Only this page's questions, already known to be shown: their conditions are settled.
    const page = { ...pages[current]!.section, showIf: undefined, questions: pages[current]!.questions.map((q) => ({ ...q, showIf: undefined })) }
    for (const [k, v] of Object.entries(checkAnswers([page], input, previous).errors)) {
      if (onPage.has(k)) found[k] = v
    }
    if (current === 0) {
      const raw = Object.fromEntries(["name", "email", "wechatId", "campus"].map((k) => [k, String(data.get(k) ?? "")]))
      const { errors: identityErrors } = checkIdentity(
        { settings: { collectEmail: ask.email, collectContact: ask.contact, oneResponse: false, editable: false, maxResponses: null }, tickets: { enabled: false, venue: "", capacity: null, days: [], types: [] } },
        mode === "edit" ? { ...raw, email: initial?.identity.email } : raw
      )
      Object.assign(found, identityErrors)
      if (ticketTypes && !data.get("ticketTypeId")) found.ticketTypeId = "Choose a ticket type."
    }
    return found
  }

  function next() {
    const found = checkPage()
    setServerErrors(INITIAL)
    setLocalErrors(found)
    if (Object.keys(found).length > 0) {
      queueMicrotask(() => summaryRef.current?.focus())
      return
    }
    setPage(current + 1)
    queueMicrotask(() => formRef.current?.scrollIntoView({ block: "start" }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const found = checkPage()
    let total = 0
    for (const input of formRef.current!.querySelectorAll<HTMLInputElement>("input[type=file]")) total += input.files?.[0]?.size ?? 0
    if (total > MAX_TOTAL_BYTES) found._files = "All files together can be at most 4 MB. Use smaller files."
    if (Object.keys(found).length > 0) {
      event.preventDefault()
      setServerErrors(INITIAL)
      setLocalErrors(found)
      queueMicrotask(() => summaryRef.current?.focus())
    }
  }

  const summary = Object.entries(errors)
  const showSummary = summary.length > 0 || !!serverErrors.error

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} noValidate className="flex scroll-mt-24 flex-col gap-8">
      {pages.length > 1 && (
        <StripMap
          line={props.line}
          stops={[
            ...pages.map(({ section }, i) => ({ label: section.title || `Section ${i + 1}` })),
            { label: mode === "edit" ? "Saved" : ticketTypes ? "Your ticket" : "Sent" },
          ]}
          current={current}
          aria-label="Form sections"
        />
      )}

      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert variant="danger" live>
            <AlertTitle>{serverErrors.error && summary.length === 0 ? "Not sent" : "Check your answers"}</AlertTitle>
            <AlertDescription>
              {serverErrors.error && <p>{serverErrors.error}</p>}
              {summary.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {summary.map(([key, message]) => (
                    <li key={key}>
                      {key === "_files" ? (
                        message
                      ) : (
                        <a href={`#${fieldId(key)}`} className="underline underline-offset-4">
                          {labelOf(key, sections)}: {message}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Bots fill every field; people never see this one. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {pages.map(({ section, questions }, i) => (
        <div key={section.id} hidden={i !== current} className="flex flex-col gap-8">
          {i === 0 && (ticketTypes || ask.email || ask.contact) && (
            <IdentityFields mode={mode} ask={ask} ticketTypes={ticketTypes} initial={initial?.identity} errors={errors} />
          )}
          {(section.title || section.description) && (
            <div className="flex flex-col gap-2 border-t pt-6">
              {section.title && <h2 className="type-heading-lg text-text">{section.title}</h2>}
              {section.description && <p className="max-w-[66ch] type-body whitespace-pre-line text-muted">{section.description}</p>}
            </div>
          )}
          <FieldGroup>
            {questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={choices[q.id] ?? initial?.values[q.id]}
                storedFile={initial?.files[q.id]}
                error={errors[q.id]}
                onChoice={(value) => setChoices((c) => ({ ...c, [q.id]: value }))}
              />
            ))}
          </FieldGroup>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        {current > 0 && (
          <Button type="button" onClick={() => setPage(current - 1)}>
            <ArrowLeftIcon aria-hidden />
            Back
          </Button>
        )}
        {last ? (
          <Button type="submit" variant="primary" size="lg" loading={pending}>
            {pending ? "Sending…" : props.submitLabel}
          </Button>
        ) : (
          <Button type="button" variant="primary" size="lg" onClick={next}>
            Next
            <ArrowRightIcon aria-hidden />
          </Button>
        )}
        {pages.length > 1 && (
          <span className="type-caption text-muted">
            Section {current + 1} of {pages.length}
          </span>
        )}
      </div>
    </form>
  )
}

function labelOf(key: string, sections: Section[]) {
  return FIELD_NAMES[key] ?? sections.flatMap((s) => s.questions).find((q) => q.id === key)?.title ?? "Answer"
}

/* -------------------------------------------------------------------------
   The fixed fields
   ------------------------------------------------------------------------- */

function IdentityFields({
  mode,
  ask,
  ticketTypes,
  initial,
  errors,
}: {
  mode: "new" | "edit"
  ask: ResponseFormProps["ask"]
  ticketTypes: TicketChoice[] | null
  initial?: Identity
  errors: Record<string, string>
}) {
  const invalid = (key: string) => (errors[key] ? true : undefined)
  const describedBy = (key: string, helper?: boolean) =>
    [helper && `f-${key}-help`, errors[key] && `f-${key}-galat`].filter(Boolean).join(" ") || undefined
  const onSale = ticketTypes?.filter((t) => !t.unavailable) ?? []

  return (
    <FieldGroup>
      {ticketTypes && mode === "new" && (
        <FieldSet data-invalid={invalid("ticketTypeId")}>
          <FieldLegend id="f-ticketTypeId" tabIndex={-1}>
            Ticket type
          </FieldLegend>
          <RadioGroup name="ticketTypeId" defaultValue={onSale.length === 1 ? onSale[0]!.id : undefined} className="gap-3">
            {ticketTypes.map((t) => (
              <FieldLabel key={t.id} htmlFor={`ticket-${t.id}`}>
                <Field orientation="horizontal" data-disabled={t.unavailable ? true : undefined}>
                  <RadioGroupItem value={t.id} id={`ticket-${t.id}`} disabled={!!t.unavailable} aria-invalid={invalid("ticketTypeId")} />
                  <FieldContent>
                    <span className="type-ui text-text">{t.name}</span>
                    <FieldDescription>
                      {[t.days, t.description, t.unavailable ?? t.note].filter(Boolean).join(" · ")}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          {errors.ticketTypeId && <FieldError id="f-ticketTypeId-galat">{errors.ticketTypeId}</FieldError>}
        </FieldSet>
      )}

      {ask.email && (
        <>
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor="f-name">Full name</FieldLabel>
            <Input
              id="f-name"
              name="name"
              autoComplete="name"
              maxLength={LIMITS.name}
              defaultValue={initial?.name}
              aria-invalid={invalid("name")}
              aria-describedby={describedBy("name", !!ticketTypes)}
            />
            {ticketTypes && <FieldDescription id="f-name-help">Printed on your ticket.</FieldDescription>}
            {errors.name && <FieldError id="f-name-galat">{errors.name}</FieldError>}
          </Field>
          <Field data-invalid={invalid("email")}>
            <FieldLabel htmlFor="f-email">Email</FieldLabel>
            {mode === "edit" ? (
              <Input id="f-email" value={initial?.email ?? ""} readOnly aria-describedby="f-email-help" />
            ) : (
              <Input
                id="f-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={LIMITS.email}
                defaultValue={initial?.email}
                aria-invalid={invalid("email")}
                aria-describedby={describedBy("email", true)}
              />
            )}
            <FieldDescription id="f-email-help">
              {mode === "edit"
                ? "The email can't be changed here. Ask us if it's wrong."
                : ticketTypes
                  ? "A copy of your ticket is sent here. Example: name@qq.com"
                  : "The link to your answers is sent here. Example: name@qq.com"}
            </FieldDescription>
            {errors.email && <FieldError id="f-email-galat">{errors.email}</FieldError>}
          </Field>
        </>
      )}

      {ask.contact && (
        <>
          <Field data-invalid={invalid("wechatId")}>
            <FieldLabel htmlFor="f-wechatId">ID WeChat</FieldLabel>
            <Input
              id="f-wechatId"
              name="wechatId"
              autoComplete="off"
              maxLength={LIMITS.wechatId}
              defaultValue={initial?.wechatId}
              aria-invalid={invalid("wechatId")}
              aria-describedby={describedBy("wechatId")}
            />
            {errors.wechatId && <FieldError id="f-wechatId-galat">{errors.wechatId}</FieldError>}
          </Field>
          <Field data-invalid={invalid("campus")}>
            <FieldLabel htmlFor="f-campus">Campus</FieldLabel>
            <NativeSelect
              id="f-campus"
              name="campus"
              defaultValue={initial?.campus ?? ""}
              aria-invalid={invalid("campus")}
              aria-describedby={describedBy("campus")}
            >
              <NativeSelectOption value="">Choose a campus</NativeSelectOption>
              {CAMPUS_OPTIONS.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errors.campus && <FieldError id="f-campus-galat">{errors.campus}</FieldError>}
          </Field>
        </>
      )}
    </FieldGroup>
  )
}

/* -------------------------------------------------------------------------
   One question
   ------------------------------------------------------------------------- */

function QuestionField({
  question: q,
  value,
  storedFile,
  error,
  onChoice,
}: {
  question: Question
  value: string | string[] | undefined
  storedFile?: string
  error?: string
  onChoice: (value: string | string[]) => void
}) {
  const id = `q-${q.id}`
  const invalid = error ? true : undefined
  const describedBy = [q.help && `${id}-help`, error && `${id}-galat`].filter(Boolean).join(" ") || undefined
  const label = (
    <>
      {q.title}
      {!q.required && <span className="type-ui text-muted"> (optional)</span>}
    </>
  )
  const help = q.help && <FieldDescription id={`${id}-help`}>{q.help}</FieldDescription>
  const problem = error && <FieldError id={`${id}-galat`}>{error}</FieldError>

  if (q.type === "single" || q.type === "multi") {
    const picked = Array.isArray(value) ? value : value ? [value] : []
    return (
      <FieldSet data-invalid={invalid}>
        <FieldLegend variant="label" id={id} tabIndex={-1}>
          {label}
        </FieldLegend>
        {help}
        {q.type === "single" ? (
          <RadioGroup name={`q:${q.id}`} value={picked[0] ?? ""} onValueChange={(v) => onChoice(String(v))} className="gap-3" aria-describedby={describedBy}>
            {q.options.map((o) => (
              <FieldLabel key={o.id} htmlFor={`${id}-${o.id}`}>
                <Field orientation="horizontal">
                  <RadioGroupItem value={o.id} id={`${id}-${o.id}`} aria-invalid={invalid} />
                  <span className="type-body text-text">{o.label}</span>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        ) : (
          <div className="flex flex-col gap-3" aria-describedby={describedBy}>
            {q.options.map((o) => (
              <FieldLabel key={o.id} htmlFor={`${id}-${o.id}`}>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`${id}-${o.id}`}
                    name={`q:${q.id}`}
                    value={o.id}
                    checked={picked.includes(o.id)}
                    onCheckedChange={(checked) =>
                      onChoice(checked ? [...picked, o.id] : picked.filter((p) => p !== o.id))
                    }
                    aria-invalid={invalid}
                  />
                  <span className="type-body text-text">{o.label}</span>
                </Field>
              </FieldLabel>
            ))}
          </div>
        )}
        {problem}
      </FieldSet>
    )
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {help}
      {q.type === "short" && (
        <Input id={id} name={`q:${q.id}`} maxLength={LIMITS.short} defaultValue={typeof value === "string" ? value : undefined} aria-invalid={invalid} aria-describedby={describedBy} />
      )}
      {q.type === "long" && (
        <Textarea id={id} name={`q:${q.id}`} rows={5} maxLength={LIMITS.long} defaultValue={typeof value === "string" ? value : undefined} aria-invalid={invalid} aria-describedby={describedBy} />
      )}
      {q.type === "file" && <FileInput id={id} name={`f:${q.id}`} stored={storedFile} invalid={invalid} describedBy={describedBy} />}
      {problem}
    </Field>
  )
}

/** A file answer. Photos are shrunk in the browser before upload; PDFs go as they are. */
function FileInput({
  id,
  name,
  stored,
  invalid,
  describedBy,
}: {
  id: string
  name: string
  stored?: string
  invalid?: true
  describedBy?: string
}) {
  const [busy, setBusy] = useState(false)

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    setBusy(true)
    const small = await shrinkImage(file, { maxSide: 2000 })
    if (small !== file) {
      const transfer = new DataTransfer()
      transfer.items.add(small)
      input.files = transfer.files
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id={id}
        name={name}
        type="file"
        accept={FILE_ACCEPT}
        onChange={onChange}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-busy={busy || undefined}
        className="type-body-sm text-text file:me-3 file:h-11 file:rounded-full file:border-2 file:border-text file:bg-transparent file:px-5 file:type-ui file:text-text hover:file:bg-surface-strong"
      />
      <span className="type-caption text-muted">
        {busy
          ? "Shrinking the photo…"
          : stored
            ? `Current file: ${stored}. Choose another file to replace it.`
            : "An image (JPG, PNG, WebP) or PDF, up to 4 MB."}
      </span>
    </div>
  )
}
