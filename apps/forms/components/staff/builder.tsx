"use client"

import { useState, useTransition } from "react"
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { DIVISIONS } from "@ppitsz/ui/lib/network"
import { saveFormAction } from "@/lib/actions/admin"
import { newId } from "@/lib/domain/codes"
import type { FormDraft } from "@/lib/domain/definition"
import { earlierChoiceQuestions } from "@/lib/domain/form"
import { QUESTION_TYPES, type Condition, type Question, type QuestionType, type Section } from "@/lib/domain/types"
import { QUESTION_TYPE_LABELS } from "@/lib/labels"

/*
 * The form builder: the whole definition as one draft in the browser, saved
 * in one action. The server parses it with the same schema and refuses what
 * would strand a response (a ticket type in use, a quota below what is taken).
 */

type Draft = FormDraft
type Tickets = Draft["tickets"]

const numberOrNull = (value: string) => (value.trim() === "" ? null : Math.max(1, Math.floor(Number(value)) || 1))

function move<T>(list: T[], index: number, by: -1 | 1) {
  const next = [...list]
  const target = index + by
  if (target < 0 || target >= next.length) return list
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export function Builder({ formId, initial, origin }: { formId: string; initial: Draft; origin: string }) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [dirty, setDirty] = useState(false)
  const [saving, start] = useTransition()

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const tickets = draft.tickets
  const setTickets = (patch: Partial<Tickets>) => update({ tickets: { ...tickets, ...patch } })
  const setSections = (sections: Section[]) => update({ sections })

  function save() {
    start(async () => {
      const result = await saveFormAction(formId, JSON.stringify(draft))
      if (result.error) notify.danger(result.error)
      else {
        setDirty(false)
        notify.success(result.message ?? "Saved.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-12">
      <Basics draft={draft} update={update} origin={origin} />
      <ResponseRules draft={draft} update={update} />
      <TicketsEditor tickets={tickets} setTickets={setTickets} />
      <SectionsEditor sections={draft.sections} setSections={setSections} />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t bg-bg px-4 py-4">
        <Button variant="primary" size="lg" loading={saving} onClick={save}>
          {saving ? "Saving…" : "Save form"}
        </Button>
        <span className="type-caption text-muted" aria-live="polite">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   Basics and rules
   ------------------------------------------------------------------------- */

function Basics({ draft, update, origin }: { draft: Draft; update: (p: Partial<Draft>) => void; origin: string }) {
  return (
    <FieldSet>
      <FieldLegend>Dasar</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="b-subject">Judul</FieldLabel>
          <Input id="b-subject" value={draft.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="b-slug">Address</FieldLabel>
          <div className="flex items-center gap-2">
            <span className="type-body-sm text-muted">{origin.replace(/^https?:\/\//, "")}/</span>
            <Input
              id="b-slug"
              value={draft.slug}
              maxLength={50}
              onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              aria-describedby="b-slug-help"
            />
          </div>
          <FieldDescription id="b-slug-help">
            Lowercase letters, numbers and hyphens. Don't change it once the link is shared.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="b-deskripsi">
            Description <span className="text-muted">(optional)</span>
          </FieldLabel>
          <Textarea id="b-deskripsi" rows={4} value={draft.description} maxLength={5000} onChange={(e) => update({ description: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="b-division">Organizing division</FieldLabel>
          <NativeSelect id="b-division" value={draft.line} onChange={(e) => update({ line: e.target.value as Draft["line"] })}>
            {DIVISIONS.map((d) => (
              <NativeSelectOption key={d.code} value={d.code}>
                {d.badge} · {d.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Its line color is used on the form and tickets.</FieldDescription>
        </Field>
        <div className="grid gap-4 @container sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="b-opens">
              Opens <span className="text-muted">(optional)</span>
            </FieldLabel>
            <Input id="b-opens" type="datetime-local" value={draft.opensAt} onChange={(e) => update({ opensAt: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="b-closes">
              Closes <span className="text-muted">(optional)</span>
            </FieldLabel>
            <Input id="b-closes" type="datetime-local" value={draft.closesAt} onChange={(e) => update({ closesAt: e.target.value })} />
          </Field>
        </div>
        <p className="type-caption text-muted">Shenzhen time. The form only takes responses while its status is Open.</p>
        <Toggle
          id="b-sembunyi"
          checked={draft.unlisted}
          onChange={(unlisted) => update({ unlisted })}
          label="Hide from the home page"
          help="Only people with the link can open it."
        />
      </FieldGroup>
    </FieldSet>
  )
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  help?: string
  disabled?: boolean
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal" data-disabled={disabled || undefined}>
        <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(c) => onChange(c)} />
        <FieldContent>
          <span className="type-ui text-text">{label}</span>
          {help && <FieldDescription>{help}</FieldDescription>}
        </FieldContent>
      </Field>
    </FieldLabel>
  )
}

function ResponseRules({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  const s = draft.settings
  const forced = draft.tickets.enabled
  const set = (patch: Partial<Draft["settings"]>) => update({ settings: { ...s, ...patch } })
  return (
    <FieldSet>
      <FieldLegend>Responses</FieldLegend>
      {forced && (
        <FieldDescription>A form with tickets always asks for name, email, WeChat and campus, and allows one ticket per email.</FieldDescription>
      )}
      <FieldGroup>
        <Toggle id="r-email" checked={forced || s.collectEmail} disabled={forced} onChange={(collectEmail) => set({ collectEmail })} label="Ask for name and email" help="Without this the form is anonymous, with no confirmation email." />
        <Toggle id="r-contact" checked={forced || s.collectContact} disabled={forced} onChange={(collectContact) => set({ collectContact })} label="Ask for WeChat ID and campus" />
        <Toggle id="r-one" checked={forced || s.oneResponse} disabled={forced} onChange={(oneResponse) => set({ oneResponse })} label="One response per person" help="Per email, or per device for an anonymous form." />
        <Toggle id="r-edit" checked={s.editable} onChange={(editable) => set({ editable })} label="Responders can edit their answers" help="Until the form closes. Email and ticket type stay the same." />
        <Field>
          <FieldLabel htmlFor="r-batas">
            Response limit <span className="text-muted">(optional)</span>
          </FieldLabel>
          <Input id="r-batas" type="number" min={1} inputMode="numeric" className="max-w-40" value={s.maxResponses ?? ""} onChange={(e) => set({ maxResponses: numberOrNull(e.target.value) })} />
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}

/* -------------------------------------------------------------------------
   Tickets
   ------------------------------------------------------------------------- */

function TicketsEditor({ tickets, setTickets }: { tickets: Tickets; setTickets: (p: Partial<Tickets>) => void }) {
  const setDay = (i: number, patch: Partial<Tickets["days"][number]>) =>
    setTickets({ days: tickets.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  const setType = (i: number, patch: Partial<Tickets["types"][number]>) =>
    setTickets({ types: tickets.types.map((t, j) => (j === i ? { ...t, ...patch } : t)) })

  return (
    <FieldSet>
      <FieldLegend>Tickets</FieldLegend>
      <Toggle
        id="t-enable"
        checked={tickets.enabled}
        onChange={(enabled) =>
          setTickets({
            enabled,
            days: enabled && tickets.days.length === 0 ? [{ id: newId(), date: "", starts: "", ends: "" }] : tickets.days,
            types:
              enabled && tickets.types.length === 0
                ? [{ id: newId(), name: "Reguler", description: "", quota: null, salesStart: "", salesEnd: "", dayIds: [] }]
                : tickets.types,
          })
        }
        label="Use tickets"
        help="Each response becomes one ticket with a QR code for check-in."
      />
      {tickets.enabled && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="t-venue">Venue</FieldLabel>
            <Input id="t-venue" value={tickets.venue} maxLength={300} onChange={(e) => setTickets({ venue: e.target.value })} placeholder="Building A Hall, SZU" />
          </Field>
          <Field>
            <FieldLabel htmlFor="t-capacity">
              Event capacity <span className="text-muted">(optional)</span>
            </FieldLabel>
            <Input id="t-capacity" type="number" min={1} inputMode="numeric" className="max-w-40" value={tickets.capacity ?? ""} onChange={(e) => setTickets({ capacity: numberOrNull(e.target.value) })} />
            <FieldDescription>All ticket types together. Each type can have its own quota too.</FieldDescription>
          </Field>

          <div className="flex flex-col gap-3">
            <h3 className="type-heading-sm text-text">Event days</h3>
            {tickets.days.map((day, i) => (
              <div key={day.id} className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4">
                <Field className="w-auto">
                  <FieldLabel htmlFor={`d-${day.id}`}>Date</FieldLabel>
                  <Input id={`d-${day.id}`} type="date" value={day.date} onChange={(e) => setDay(i, { date: e.target.value })} />
                </Field>
                <Field className="w-auto">
                  <FieldLabel htmlFor={`d-${day.id}-start`}>
                    Starts <span className="text-muted">(optional)</span>
                  </FieldLabel>
                  <Input id={`d-${day.id}-start`} type="time" value={day.starts} onChange={(e) => setDay(i, { starts: e.target.value })} />
                </Field>
                <Field className="w-auto">
                  <FieldLabel htmlFor={`d-${day.id}-end`}>
                    Ends <span className="text-muted">(optional)</span>
                  </FieldLabel>
                  <Input id={`d-${day.id}-end`} type="time" value={day.ends} onChange={(e) => setDay(i, { ends: e.target.value })} />
                </Field>
                {tickets.days.length > 1 && (
                  <Button variant="quiet" size="icon" aria-label="Remove this day" onClick={() => setTickets({ days: tickets.days.filter((_, j) => j !== i) })}>
                    <TrashIcon aria-hidden />
                  </Button>
                )}
              </div>
            ))}
            <Button size="sm" className="self-start" onClick={() => setTickets({ days: [...tickets.days, { id: newId(), date: "", starts: "", ends: "" }] })}>
              Add day
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="type-heading-sm text-text">Ticket types</h3>
            {tickets.types.map((type, i) => (
              <div key={type.id} className="flex flex-col gap-4 rounded-xl bg-surface p-4">
                <div className="flex items-end gap-3">
                  <Field>
                    <FieldLabel htmlFor={`tt-${type.id}`}>Name</FieldLabel>
                    <Input id={`tt-${type.id}`} value={type.name} maxLength={80} onChange={(e) => setType(i, { name: e.target.value })} />
                  </Field>
                  {tickets.types.length > 1 && (
                    <Button variant="quiet" size="icon" aria-label={`Remove type ${type.name}`} onClick={() => setTickets({ types: tickets.types.filter((_, j) => j !== i) })}>
                      <TrashIcon aria-hidden />
                    </Button>
                  )}
                </div>
                <Field>
                  <FieldLabel htmlFor={`tt-${type.id}-ket`}>
                    Description <span className="text-muted">(optional)</span>
                  </FieldLabel>
                  <Input id={`tt-${type.id}-ket`} value={type.description} maxLength={500} onChange={(e) => setType(i, { description: e.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={`tt-${type.id}-quota`}>
                      Quota <span className="text-muted">(optional)</span>
                    </FieldLabel>
                    <Input id={`tt-${type.id}-quota`} type="number" min={1} inputMode="numeric" value={type.quota ?? ""} onChange={(e) => setType(i, { quota: numberOrNull(e.target.value) })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`tt-${type.id}-from`}>
                      On sale from <span className="text-muted">(optional)</span>
                    </FieldLabel>
                    <Input id={`tt-${type.id}-from`} type="datetime-local" value={type.salesStart} onChange={(e) => setType(i, { salesStart: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`tt-${type.id}-until`}>
                      On sale until <span className="text-muted">(optional)</span>
                    </FieldLabel>
                    <Input id={`tt-${type.id}-until`} type="datetime-local" value={type.salesEnd} onChange={(e) => setType(i, { salesEnd: e.target.value })} />
                  </Field>
                </div>
                {tickets.days.length > 1 && (
                  <FieldSet>
                    <FieldLegend variant="label">Valid on days</FieldLegend>
                    <FieldDescription>None ticked: every day.</FieldDescription>
                    <div className="flex flex-wrap gap-4">
                      {tickets.days.map((day) => (
                        <Toggle
                          key={day.id}
                          id={`tt-${type.id}-${day.id}`}
                          checked={type.dayIds.includes(day.id)}
                          onChange={(on) => setType(i, { dayIds: on ? [...type.dayIds, day.id] : type.dayIds.filter((d) => d !== day.id) })}
                          label={day.date || "Date not set"}
                        />
                      ))}
                    </div>
                  </FieldSet>
                )}
              </div>
            ))}
            <Button
              size="sm"
              className="self-start"
              onClick={() =>
                setTickets({ types: [...tickets.types, { id: newId(), name: "", description: "", quota: null, salesStart: "", salesEnd: "", dayIds: [] }] })
              }
            >
              Add ticket type
            </Button>
          </div>
        </FieldGroup>
      )}
    </FieldSet>
  )
}

/* -------------------------------------------------------------------------
   Sections and questions
   ------------------------------------------------------------------------- */

function newQuestion(type: QuestionType = "short"): Question {
  const options = type === "single" || type === "multi" ? [{ id: newId(), label: "" }, { id: newId(), label: "" }] : []
  return { id: newId(), type, title: "", help: "", required: false, options }
}

function SectionsEditor({ sections, setSections }: { sections: Section[]; setSections: (s: Section[]) => void }) {
  const setSection = (i: number, patch: Partial<Section>) => setSections(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="type-heading-lg text-text">Questions</h2>
        <p className="type-body-sm text-muted">Each section shows as one page. Name, email, WeChat and campus are asked automatically, per the settings above.</p>
      </div>
      {sections.map((section, i) => (
        <section key={section.id} aria-label={`Section ${i + 1}`} className="flex flex-col gap-5 rounded-xl border-2 border-border-strong p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="type-heading-sm text-text">Section {i + 1}</h3>
            <div className="flex gap-1">
              <Button variant="quiet" size="icon-sm" aria-label="Move section up" disabled={i === 0} onClick={() => setSections(move(sections, i, -1))}>
                <ArrowUpIcon aria-hidden />
              </Button>
              <Button variant="quiet" size="icon-sm" aria-label="Move section down" disabled={i === sections.length - 1} onClick={() => setSections(move(sections, i, 1))}>
                <ArrowDownIcon aria-hidden />
              </Button>
              {sections.length > 1 && (
                <Button variant="quiet" size="icon-sm" aria-label="Remove section" onClick={() => setSections(sections.filter((_, j) => j !== i))}>
                  <TrashIcon aria-hidden />
                </Button>
              )}
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor={`s-${section.id}`}>
              Section title <span className="text-muted">(optional)</span>
            </FieldLabel>
            <Input id={`s-${section.id}`} value={section.title} maxLength={200} onChange={(e) => setSection(i, { title: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`s-${section.id}-ket`}>
              Description <span className="text-muted">(optional)</span>
            </FieldLabel>
            <Textarea id={`s-${section.id}-ket`} rows={2} value={section.description} maxLength={2000} onChange={(e) => setSection(i, { description: e.target.value })} />
          </Field>
          {i > 0 && (
            <ConditionEditor
              id={`s-${section.id}-syarat`}
              choices={earlierChoiceQuestions(sections, section.id)}
              value={section.showIf}
              onChange={(showIf) => setSection(i, { showIf })}
              what="this section"
            />
          )}

          {section.questions.map((q, k) => (
            <QuestionEditor
              key={q.id}
              question={q}
              choices={earlierChoiceQuestions(sections, q.id)}
              first={k === 0}
              last={k === section.questions.length - 1}
              onChange={(patch) => setSection(i, { questions: section.questions.map((x, j) => (j === k ? { ...x, ...patch } : x)) })}
              onMove={(by) => setSection(i, { questions: move(section.questions, k, by) })}
              onRemove={() => setSection(i, { questions: section.questions.filter((_, j) => j !== k) })}
            />
          ))}
          <Button size="sm" className="self-start" onClick={() => setSection(i, { questions: [...section.questions, newQuestion()] })}>
            Add question
          </Button>
        </section>
      ))}
      <Button className="self-start" onClick={() => setSections([...sections, { id: newId(), title: "", description: "", questions: [] }])}>
        Add section
      </Button>
    </div>
  )
}

function QuestionEditor({
  question: q,
  choices,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  question: Question
  choices: Question[]
  first: boolean
  last: boolean
  onChange: (patch: Partial<Question>) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}) {
  const isChoice = q.type === "single" || q.type === "multi"
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-48 flex-1">
          <FieldLabel htmlFor={`q-${q.id}`}>Question</FieldLabel>
          <Input id={`q-${q.id}`} value={q.title} maxLength={300} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field className="w-auto">
          <FieldLabel htmlFor={`q-${q.id}-type`}>Type</FieldLabel>
          <NativeSelect
            id={`q-${q.id}-type`}
            value={q.type}
            onChange={(e) => {
              const type = e.target.value as QuestionType
              const wantsOptions = type === "single" || type === "multi"
              onChange({ type, options: wantsOptions ? (q.options.length ? q.options : newQuestion(type).options) : [] })
            }}
          >
            {QUESTION_TYPES.map((t) => (
              <NativeSelectOption key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`q-${q.id}-help`}>
          Hint <span className="text-muted">(optional)</span>
        </FieldLabel>
        <Input id={`q-${q.id}-help`} value={q.help} maxLength={1000} onChange={(e) => onChange({ help: e.target.value })} />
      </Field>
      {isChoice && (
        <FieldSet>
          <FieldLegend variant="label">Options</FieldLegend>
          {q.options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2">
              <Input
                aria-label={`Option ${i + 1}`}
                value={o.label}
                maxLength={200}
                onChange={(e) => onChange({ options: q.options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
              />
              {q.options.length > 2 && (
                <Button variant="quiet" size="icon-sm" aria-label={`Remove option ${i + 1}`} onClick={() => onChange({ options: q.options.filter((x) => x.id !== o.id) })}>
                  <TrashIcon aria-hidden />
                </Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="quiet" className="self-start" onClick={() => onChange({ options: [...q.options, { id: newId(), label: "" }] })}>
            Add option
          </Button>
        </FieldSet>
      )}
      <ConditionEditor id={`q-${q.id}-condition`} choices={choices} value={q.showIf} onChange={(showIf) => onChange({ showIf })} what="this question" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle id={`q-${q.id}-required`} checked={q.required} onChange={(required) => onChange({ required })} label="Required" />
        <div className="flex gap-1">
          <Button variant="quiet" size="icon-sm" aria-label="Move question up" disabled={first} onClick={() => onMove(-1)}>
            <ArrowUpIcon aria-hidden />
          </Button>
          <Button variant="quiet" size="icon-sm" aria-label="Move question down" disabled={last} onClick={() => onMove(1)}>
            <ArrowDownIcon aria-hidden />
          </Button>
          <Button variant="quiet" size="icon-sm" aria-label="Remove question" onClick={onRemove}>
            <TrashIcon aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

/** "Show only if <earlier choice> is answered <options>". */
function ConditionEditor({
  id,
  choices,
  value,
  onChange,
  what,
}: {
  id: string
  choices: Question[]
  value: Condition | undefined
  onChange: (c: Condition | undefined) => void
  what: string
}) {
  if (choices.length === 0) return null
  const source = choices.find((c) => c.id === value?.questionId)
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={id}>Show {what}</FieldLabel>
        <NativeSelect
          id={id}
          value={value?.questionId ?? ""}
          onChange={(e) => {
            const q = choices.find((c) => c.id === e.target.value)
            onChange(q ? { questionId: q.id, optionIds: q.options[0] ? [q.options[0].id] : [] } : undefined)
          }}
        >
          <NativeSelectOption value="">Selalu</NativeSelectOption>
          {choices.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              If “{c.title || "untitled question"}” is answered…
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {source && value && (
        <div className="flex flex-wrap gap-4">
          {source.options.map((o) => (
            <Toggle
              key={o.id}
              id={`${id}-${o.id}`}
              checked={value.optionIds.includes(o.id)}
              onChange={(on) =>
                onChange({ ...value, optionIds: on ? [...value.optionIds, o.id] : value.optionIds.filter((x) => x !== o.id) })
              }
              label={o.label || "Unnamed option"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
