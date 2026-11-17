"use client"

import NextLink from "next/link"
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { CameraIcon, CheckIcon, ImageIcon, ScanIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Gate, GateDescription, GateHolder, GateTitle, type GateVerdict } from "@ppitsz/ui/components/blocks/gate"
import { GateSoundToggle } from "@ppitsz/ui/components/blocks/gate-sound"
import { NoService } from "@ppitsz/ui/components/blocks/no-service"
import { Button } from "@ppitsz/ui/components/button"
import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import { Field, FieldError, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { Link } from "@ppitsz/ui/components/link"
import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { notify } from "@ppitsz/ui/components/sonner"
import { useGateSignal } from "@ppitsz/ui/hooks/use-gate-signal"
import { formatTime } from "@ppitsz/ui/lib/format"
import { handOverAction, lookupScanAction, type ScanResult, type ScannedOrder } from "@/lib/actions/staff"
import { customNamesLabel } from "@/lib/domain/order"
import { OrderStatusBadge, when } from "./order-bits"
import { TestBadge } from "../test-badge"
import { decodeImageFile, useQrCamera, type CameraState } from "./qr-camera"

interface Handover {
  id: string
  code: string
  buyerName: string | null
  qty: number
  at: Date
}

/** Ignore the QR that is still in front of the camera after "Scan next". */
const SAME_CODE_COOLDOWN_MS = 4000

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const lastRef = useRef({ text: "", at: 0 })
  const [result, setResult] = useState<ScanResult | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [manualCode, setManualCode] = useState("")
  const [manualError, setManualError] = useState<string>()
  const [recent, setRecent] = useState<Handover[]>([])
  const [looking, startLookup] = useTransition()
  const [handing, startHandOver] = useTransition()
  const gate = useGateSignal()

  const camera = useQrCamera(videoRef, {
    paused: result !== null || looking,
    onScan(text) {
      const now = Date.now()
      const last = lastRef.current
      lastRef.current = { text, at: now }
      if (text === last.text && now - last.at < SAME_CODE_COOLDOWN_MS) return
      lookup(text, "camera")
    },
  })

  function show(next: ScanResult) {
    setResult(next)
    const order = next.order
    setSelected(
      new Set(order?.canHandOver ? order.items.flatMap((item, i) => (item.pickedUp ? [] : [i])) : [])
    )
  }

  function lookup(text: string, source: "camera" | "photo" | "typed") {
    startLookup(async () => {
      const found = await lookupScanAction(text)
      if (!found.ok && !found.order) {
        gate.signal("stop")
        if (source === "typed") setManualError(found.error)
        else notify.danger(found.error)
        return
      }
      if (found.order) gate.signal(gateFor(found, found.order, remainingOf(found.order)).verdict)
      setManualError(undefined)
      setManualCode("")
      show(found)
    })
  }

  async function readPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const text = await decodeImageFile(file).catch(() => null)
    if (text) lookup(text, "photo")
    else notify.danger("No QR code found in this photo. Try closer and sharper, or type the code.")
  }

  function handOver(order: ScannedOrder) {
    startHandOver(async () => {
      const done = await handOverAction(order.id, [...selected])
      show(done)
      if (!done.ok) gate.signal("stop")
      if (done.ok && done.handedOver) {
        gate.signal("go")
        setRecent((list) =>
          [
            { id: order.id, code: order.code, buyerName: order.buyerName, qty: done.handedOver!, at: new Date() },
            ...list,
          ].slice(0, 8)
        )
      }
    })
  }

  function next() {
    // Counts from now, so the QR still in view isn't read again at once.
    lastRef.current = { ...lastRef.current, at: Date.now() }
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-10" onPointerDown={gate.prime}>
      <NoService lines={["danus"]}>
        <p>Orders can&apos;t be looked up until it reconnects. Meanwhile, hand over from the printed pickup list.</p>
      </NoService>
      <GateSoundToggle className="self-start" />
      {/* The camera keeps running behind the result, so the next scan starts at once. */}
      <section aria-label="Scan QR code" hidden={result !== null} className="flex flex-col gap-6">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-strong">
          <video ref={videoRef} muted playsInline aria-hidden className="size-full object-cover" />
          {camera === "on" ? (
            <div aria-hidden className="pointer-events-none absolute inset-[14%] rounded-xl border-2 border-white" />
          ) : (
            <CameraMessage state={camera} />
          )}
          {looking && (
            <p
              role="status"
              className="absolute inset-x-4 bottom-4 rounded-full bg-surface-raised px-4 py-2 text-center type-ui text-text"
            >
              Looking up the order…
            </p>
          )}
        </div>
        <p className="type-body-sm text-muted">
          Point the camera at the QR code on the buyer's phone. If the camera won't work, take a photo of it or type
          the code.
        </p>

        <div className="flex flex-col gap-4">
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={readPhoto}
          />
          <Button variant="secondary" className="self-start" onClick={() => photoRef.current?.click()}>
            <ImageIcon aria-hidden />
            Take or choose a photo of the QR code
          </Button>

          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!manualCode.trim()) setManualError("Write the order code, like GC-7K3P.")
              else lookup(manualCode, "typed")
            }}
          >
            <Field data-invalid={!!manualError || undefined}>
              <FieldLabel htmlFor="code">Order code</FieldLabel>
              <div className="flex gap-3">
                <Input
                  id="code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="GC-7K3P"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!manualError || undefined}
                  className="max-w-48"
                />
                <Button type="submit" variant="secondary" loading={looking}>
                  Search
                </Button>
              </div>
              {manualError && <FieldError>{manualError}</FieldError>}
            </Field>
          </form>
        </div>
      </section>

      {result?.order && (
        <ScanResultCard
          result={result}
          order={result.order}
          selected={selected}
          onToggle={(i, on) =>
            setSelected((set) => {
              const copy = new Set(set)
              if (on) copy.add(i)
              else copy.delete(i)
              return copy
            })
          }
          handing={handing}
          onHandOver={() => handOver(result.order!)}
          onNext={next}
        />
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="flex flex-col gap-3">
          <h2 id="recent" className="type-heading-md text-text">
            Recently handed over on this phone
          </h2>
          <ul className="flex flex-col">
            {recent.map((h) => (
              <li key={`${h.id}-${h.at.getTime()}`} className="flex items-baseline justify-between gap-4 border-t py-2">
                <Link as={NextLink} href={`/staff/orders/${h.id}`} variant="standalone">
                  {h.code}
                </Link>
                <span className="min-w-0 flex-1 truncate type-body-sm text-muted">
                  {h.buyerName ?? "Booth buyer"} · {h.qty} {h.qty === 1 ? "item" : "items"}
                </span>
                <span className="type-caption text-muted">{formatTime(h.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CameraMessage({ state }: { state: Exclude<CameraState, "on"> }) {
  const text = {
    starting: "Starting the camera…",
    denied: "Camera access was denied. Allow the camera for this site in your browser settings, then reload.",
    unavailable:
      "The camera can't be used in this browser. It needs an https address; here, take a photo of the QR code or type the code.",
  }[state]
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <CameraIcon aria-hidden className="size-10 text-muted" />
      <p className="max-w-[40ch] type-body-sm text-text">{text}</p>
    </div>
  )
}

function ScanResultCard({
  result,
  order,
  selected,
  onToggle,
  handing,
  onHandOver,
  onNext,
}: {
  result: ScanResult
  order: ScannedOrder
  selected: Set<number>
  onToggle: (index: number, on: boolean) => void
  handing: boolean
  onHandOver: () => void
  onNext: () => void
}) {
  const { canHandOver } = order
  const selectedQty = [...selected].reduce((sum, i) => sum + (order.items[i]?.qty ?? 0), 0)
  const remaining = remainingOf(order)
  const gate = gateFor(result, order, remaining)
  const actionRef = useRef<HTMLButtonElement>(null)
  // Each new result moves focus to the next action; the gate announces itself.
  useEffect(() => actionRef.current?.focus(), [result])

  return (
    <section aria-label={`Order ${order.code}`} className="flex flex-col gap-6">
      <Gate verdict={gate.verdict}>
        <GateTitle>{gate.title}</GateTitle>
        <GateHolder name={order.buyerName ?? `Order ${order.code}`}>
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <StationCode code={order.code} line="danus" />
            {order.campaignName}
            {order.buyerName && ` · WeChat ${order.wechatId}`}
            <OrderStatusBadge status={order.shownStatus} />
            {order.test && <TestBadge />}
          </span>
        </GateHolder>
        {gate.description && <GateDescription>{gate.description}</GateDescription>}
      </Gate>

      {order.delivery && order.status === "paid" && (
        <Alert variant="warning">
          <AlertTitle>Delivery order · {order.delivery.slot}</AlertTitle>
          <AlertDescription>
            Meant to be delivered to {order.delivery.address}. If the buyer is picking it up, hand over everything
            at once.
          </AlertDescription>
        </Alert>
      )}

      <Card variant="outline">
        <CardContent>
          {canHandOver && <p className="mb-3 type-ui text-text">Tick the items you hand over</p>}
          <ul className="flex flex-col">
            {order.items.map((item, i) => {
              const names = customNamesLabel(item)
              const label = `${item.qty}× ${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ""}${names ? ` – ${names}` : ""}`
              return (
                <li key={i} className="border-t first:border-t-0">
                  {canHandOver && !item.pickedUp ? (
                    <label className="flex cursor-pointer items-center gap-4 py-3">
                      <Checkbox
                        checked={selected.has(i)}
                        // A delivery order is handed over whole.
                        disabled={!!order.delivery}
                        onCheckedChange={(on) => onToggle(i, on)}
                      />
                      <span className="type-body text-text">{label}</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className={item.pickedUp ? "type-body text-muted line-through" : "type-body text-text"}>
                        {label}
                      </span>
                      {item.pickedUp && <span className="type-caption text-muted">Handed over</span>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {canHandOver && (
          <Button
            variant="primary"
            size="lg"
            loading={handing}
            disabled={selectedQty === 0}
            onClick={onHandOver}
            ref={actionRef}
          >
            <CheckIcon aria-hidden weight="bold" />
            {handing ? "Saving…" : `Hand over ${selectedQty} ${selectedQty === 1 ? "item" : "items"}`}
          </Button>
        )}
        <Button variant={canHandOver ? "secondary" : "primary"} size="lg" onClick={onNext} ref={canHandOver ? undefined : actionRef}>
          <ScanIcon aria-hidden />
          Scan next
        </Button>
        <Link as={NextLink} href={`/staff/orders/${order.id}`} variant="standalone">
          Order details
        </Link>
      </div>
    </section>
  )
}

function remainingOf(order: ScannedOrder) {
  return order.items.filter((item) => !item.pickedUp).length
}

interface GateCopy {
  verdict: GateVerdict
  title: string
  description?: ReactNode
}

/** The gate for a scan: go when it can be handed over, hold when it needs a look first, stop otherwise. */
function gateFor(result: ScanResult, order: ScannedOrder, remaining: number): GateCopy {
  if (result.ok && result.handedOver) {
    return {
      verdict: "go",
      title: `${result.handedOver} ${result.handedOver === 1 ? "item" : "items"} handed over`,
      description:
        remaining === 0
          ? "Order complete."
          : `${remaining} more ${remaining === 1 ? "line is" : "lines are"} still to collect. Scan again when the buyer comes back.`,
    }
  }
  switch (order.status) {
    case "paid":
      return result.ok
        ? { verdict: "go", title: "Ready to hand over" }
        : { verdict: "stop", title: "Can't hand over yet", description: result.error }
    case "picked_up":
      return {
        verdict: "stop",
        title: "Already picked up",
        description: (
          <>
            {order.pickedUpAt && `Handed over ${when(order.pickedUpAt)} by ${order.handledByName ?? "staff"}. `}
            Don&apos;t hand it over again. If the buyer says they didn&apos;t get it, call a shop admin.
          </>
        ),
      }
    case "awaiting_verification":
      return {
        verdict: "hold",
        title: "Payment not checked yet",
        description: order.canVerify ? (
          <>
            The transfer proof has been sent.{" "}
            <NextLink href={`/staff/orders/${order.id}`} className="underline underline-offset-4">
              Check the payment
            </NextLink>
            , then scan again.
          </>
        ) : (
          "The transfer proof has been sent but not checked. Ask a shop admin to check it, then scan again."
        ),
      }
    case "pending_payment":
      return {
        verdict: "stop",
        title: "Not paid",
        description:
          "The buyer hasn't sent a transfer proof. Ask them to pay and send the proof from their order page, or buy at the register.",
      }
    case "expired":
      return {
        verdict: "stop",
        title: "Expired",
        description: "The order was canceled automatically because it wasn't paid in time. The buyer can buy at the register.",
      }
    case "cancelled":
      return { verdict: "stop", title: "Canceled", description: "An admin has canceled this order." }
  }
}
