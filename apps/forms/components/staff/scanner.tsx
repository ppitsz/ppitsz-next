"use client"

import { useActionState, useRef, useState, useTransition } from "react"
import { CameraIcon, ImagesIcon, UserIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Gate, GateActions, GateDescription, GateHolder, GateTitle, type GateVerdict } from "@ppitsz/ui/components/blocks/gate"
import { GateSoundToggle } from "@ppitsz/ui/components/blocks/gate-sound"
import { NoService } from "@ppitsz/ui/components/blocks/no-service"
import { StationCode } from "@ppitsz/ui/components/network/station-code"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { useGateSignal } from "@ppitsz/ui/hooks/use-gate-signal"
import { formatTime } from "@ppitsz/ui/lib/format"
import type { ActionState } from "@/lib/actions/state"
import { doorAddAction, scanAction, undoCheckInAction, type ScanOutcome } from "@/lib/actions/staff"
import { CAMPUS_OPTIONS } from "@/lib/labels"
import { decodeImageFile, useQrCamera, type CameraState } from "../qr-camera"

/*
 * The door. A read checks the ticket in for the chosen day at once: no extra
 * tap in a queue. A second read the same day shows who checked it in and
 * when, and a ticket for another day is refused. The QR is decoded on the
 * phone; only the lookup goes to the server.
 */

/** Ignore the QR still in front of the camera after "Scan next". */
const SAME_CODE_COOLDOWN_MS = 4000

interface Day {
  id: string
  label: string
  /** Live tickets valid that day, and how many are checked in. */
  expected: number
  present: number
}

export function Scanner({
  formId,
  days,
  defaultDayId,
  types,
}: {
  formId: string
  days: Day[]
  defaultDayId: string
  types: { id: string; name: string; full: boolean }[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const lastRef = useRef({ text: "", at: 0 })
  const [dayId, setDayId] = useState(defaultDayId)
  const [result, setResult] = useState<ScanOutcome | null>(null)
  const [code, setCode] = useState("")
  const [present, setPresent] = useState<Record<string, number>>(() => Object.fromEntries(days.map((d) => [d.id, d.present])))
  const [recent, setRecent] = useState<{ name: string; code: string; at: Date; kind: string }[]>([])
  const [looking, startLookup] = useTransition()
  const [undoing, startUndo] = useTransition()
  const gate = useGateSignal()
  const day = days.find((d) => d.id === dayId)!

  const camera = useQrCamera(videoRef, {
    paused: result !== null || looking,
    onScan(text) {
      const now = Date.now()
      const last = lastRef.current
      lastRef.current = { text, at: now }
      if (text === last.text && now - last.at < SAME_CODE_COOLDOWN_MS) return
      lookup(text)
    },
  })

  function lookup(text: string) {
    startLookup(async () => {
      const outcome = await scanAction(formId, dayId, text)
      setResult(outcome)
      gate.signal(verdictOf(outcome))
      if (outcome.ok && outcome.result.kind === "checked_in") {
        setPresent((p) => ({ ...p, [dayId]: (p[dayId] ?? 0) + 1 }))
        setCode("")
      }
      if (outcome.ok) {
        setRecent((list) => [{ name: outcome.name, code: outcome.code, at: new Date(), kind: outcome.result.kind }, ...list].slice(0, 10))
      }
    })
  }

  async function readPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const text = await decodeImageFile(file).catch(() => null)
    if (text) lookup(text)
    else notify.danger("No QR code found in this photo. Try closer and sharper, or type the code.")
  }

  function next() {
    // Counts from now, so the QR still in view isn't read again at once.
    lastRef.current = { ...lastRef.current, at: Date.now() }
    setResult(null)
  }

  function undo(outcome: Extract<ScanOutcome, { ok: true }>) {
    startUndo(async () => {
      const done = await undoCheckInAction(formId, outcome.responseId, outcome.dayId)
      if (done.error) {
        notify.danger(done.error)
        return
      }
      setPresent((p) => ({ ...p, [outcome.dayId]: Math.max(0, (p[outcome.dayId] ?? 0) - 1) }))
      notify.success(`Check-in for ${outcome.name} undone.`)
      next()
    })
  }

  return (
    <div className="flex flex-col gap-8" onPointerDown={gate.prime}>
      <NoService>
        <p>Tickets can&apos;t be checked until it reconnects. Meanwhile, tick people off on the printed check-in list.</p>
      </NoService>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field className="w-auto">
          <FieldLabel htmlFor="day">Day</FieldLabel>
          <NativeSelect id="day" value={dayId} onChange={(e) => setDayId(e.target.value)}>
            {days.map((d) => (
              <NativeSelectOption key={d.id} value={d.id}>
                {d.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <p className="type-body text-text" aria-live="polite">
          <span className="type-heading-md">{present[dayId] ?? 0}</span>
          <span className="text-muted"> of {day.expected} checked in</span>
        </p>
        <GateSoundToggle />
      </div>

      {result ? (
        <ResultCard result={result} onNext={next} onUndo={undo} undoing={undoing} />
      ) : null}

      {/* The camera keeps running behind the result, so the next scan starts at once. */}
      <section aria-label="Scan QR code" hidden={result !== null} className="flex flex-col gap-6">
        <div className="relative aspect-square w-full max-w-xl overflow-hidden rounded-xl bg-surface-strong">
          <video ref={videoRef} muted playsInline aria-hidden className="size-full object-cover" />
          {camera === "on" ? (
            <div aria-hidden className="pointer-events-none absolute inset-[14%] rounded-xl border-2 border-white" />
          ) : (
            <CameraMessage state={camera} />
          )}
          {looking && (
            <p role="status" className="absolute inset-x-4 bottom-4 rounded-full bg-surface-raised px-4 py-2 text-center type-ui text-text">
              Looking up the ticket…
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <input ref={photoRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={readPhoto} />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => photoRef.current?.click()}>
              <ImagesIcon aria-hidden />
              Take or choose a photo of the QR code
            </Button>
            <DoorAdd formId={formId} dayId={dayId} types={types} onAdded={() => setPresent((p) => ({ ...p, [dayId]: (p[dayId] ?? 0) + 1 }))} />
          </div>
          <form
            className="flex max-w-md flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) lookup(code)
            }}
          >
            <Field>
              <FieldLabel htmlFor="code">Ticket code</FieldLabel>
              <div className="flex gap-3">
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="K7P3QX" />
                <Button type="submit" loading={looking}>
                  Look up
                </Button>
              </div>
              <FieldDescription>The six letters and digits under the QR code, if it won't scan.</FieldDescription>
            </Field>
          </form>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="flex flex-col gap-3">
          <h2 id="recent" className="type-heading-sm text-text">
            Recent scans on this phone
          </h2>
          <ul className="flex flex-col">
            {recent.map((r, i) => (
              <li key={i} className="flex justify-between gap-3 border-b py-2 type-body-sm text-text">
                <span>
                  {r.name} <span className="text-muted">· {r.code}</span>
                </span>
                <span className="text-muted">
                  {r.kind === "checked_in" ? "Checked in" : r.kind === "again" ? "Already checked in" : "Refused"} · {formatTime(r.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ResultCard({
  result,
  onNext,
  onUndo,
  undoing,
}: {
  result: ScanOutcome
  onNext: () => void
  onUndo: (r: Extract<ScanOutcome, { ok: true }>) => void
  undoing: boolean
}) {
  const verdict = verdictOf(result)
  const title = !result.ok
    ? "Can't check in"
    : result.result.kind === "checked_in"
      ? "Checked in"
      : result.result.kind === "again"
        ? "Already checked in"
        : "Refused"
  const detail = !result.ok
    ? result.message
    : result.result.kind === "again"
      ? `Already checked in at ${formatTime(result.result.checkIn.at)} by ${result.result.checkIn.byName}. If it's a different person, check their ID.`
      : result.message
  return (
    <Gate verdict={verdict} className="max-w-xl">
      <GateTitle>{title}</GateTitle>
      {result.ok && (
        <GateHolder name={result.name}>
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <StationCode code={result.code} />
            {result.typeName}
            {result.source === "door" && " · walk-in sign-up"}
          </span>
        </GateHolder>
      )}
      {detail && <GateDescription>{detail}</GateDescription>}
      <GateActions>
        <Button variant="primary" size="lg" onClick={onNext} autoFocus>
          Scan next
        </Button>
        {result.ok && result.result.kind === "checked_in" && (
          <Button variant="quiet" loading={undoing} onClick={() => onUndo(result)}>
            Undo check-in
          </Button>
        )}
      </GateActions>
    </Gate>
  )
}

/** Go when checked in, hold when already checked in, stop otherwise. */
function verdictOf(result: ScanOutcome): GateVerdict {
  if (!result.ok || result.result.kind === "refused") return "stop"
  return result.result.kind === "again" ? "hold" : "go"
}

function CameraMessage({ state }: { state: Exclude<CameraState, "on"> }) {
  const text = {
    starting: "Starting the camera…",
    denied: "Camera access was denied. Allow the camera for this site in your browser settings, then reload.",
    unavailable: "The camera can't be used in this browser. It needs an https address; here, take a photo of the QR code or type the code.",
  }[state]
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <CameraIcon aria-hidden className="size-10 text-muted" />
      <p className="max-w-[40ch] type-body-sm text-text">{text}</p>
    </div>
  )
}

const INITIAL: ActionState = {}

/** Walk-in sign-up: a ticket made at the door, already checked in. It counts against the quota. */
function DoorAdd({
  formId,
  dayId,
  types,
  onAdded,
}: {
  formId: string
  dayId: string
  types: { id: string; name: string; full: boolean }[]
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(doorAddAction.bind(null, formId, dayId), INITIAL)
  const [lastDone, setLastDone] = useState(state.done)
  if (state.done !== lastDone) {
    setLastDone(state.done)
    if (state.done) {
      setOpen(false)
      onAdded()
      notify.success(state.message ?? "Terdaftar.")
    }
  }
  const err = (k: string) => state.fieldErrors?.[k]

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger render={<Button />}>
        <UserIcon aria-hidden />
        Walk-in sign-up
      </DialogTrigger>
      <DialogContent size="sm">
        <form action={action} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Walk-in sign-up</DialogTitle>
            <DialogDescription>For someone who came without a ticket. They're checked in for today right away.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FieldGroup>
              <Field data-invalid={!!err("ticketTypeId") || undefined}>
                <FieldLabel htmlFor="pintu-type">Ticket type</FieldLabel>
                <NativeSelect id="pintu-type" name="ticketTypeId" defaultValue={types.find((t) => !t.full)?.id ?? ""}>
                  <NativeSelectOption value="">Choose a type</NativeSelectOption>
                  {types.map((t) => (
                    <NativeSelectOption key={t.id} value={t.id} disabled={t.full}>
                      {t.name}
                      {t.full ? " (full)" : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {err("ticketTypeId") && <FieldError>{err("ticketTypeId")}</FieldError>}
              </Field>
              <Field data-invalid={!!err("name") || undefined}>
                <FieldLabel htmlFor="pintu-name">Name</FieldLabel>
                <Input id="pintu-name" name="name" autoComplete="off" aria-invalid={!!err("name") || undefined} />
                {err("name") && <FieldError>{err("name")}</FieldError>}
              </Field>
              <Field data-invalid={!!err("email") || undefined}>
                <FieldLabel htmlFor="door-email">
                  Email <span className="text-muted">(optional)</span>
                </FieldLabel>
                <Input id="door-email" name="email" type="email" inputMode="email" autoComplete="off" aria-invalid={!!err("email") || undefined} />
                <FieldDescription>If filled in, the ticket is sent here.</FieldDescription>
                {err("email") && <FieldError>{err("email")}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="door-wechat">
                  WeChat ID <span className="text-muted">(optional)</span>
                </FieldLabel>
                <Input id="door-wechat" name="wechatId" autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="door-campus">
                  Campus <span className="text-muted">(optional)</span>
                </FieldLabel>
                <NativeSelect id="door-campus" name="campus" defaultValue="">
                  <NativeSelectOption value="">Choose a campus</NativeSelectOption>
                  {CAMPUS_OPTIONS.map((c) => (
                    <NativeSelectOption key={c.value} value={c.value}>
                      {c.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            {state.error && (
              <Alert variant="danger" live className="mt-4">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
          </DialogBody>
          <DialogFooter showCloseButton>
            <Button type="submit" variant="primary" loading={pending}>
              {pending ? "Signing up…" : "Sign up and check in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
