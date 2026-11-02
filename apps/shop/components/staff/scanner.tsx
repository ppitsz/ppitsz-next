"use client"

import NextLink from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { CameraIcon, CheckIcon, ImageIcon, ScanIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Card, CardContent } from "@ppitsz/ui/components/card"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import { Field, FieldError, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { Link } from "@ppitsz/ui/components/link"
import { notify } from "@ppitsz/ui/components/sonner"
import { formatTime } from "@ppitsz/ui/lib/format"
import { handOverAction, lookupScanAction, type ScanResult, type ScannedOrder } from "@/lib/actions/staff"
import { OrderStatusBadge, when } from "./order-bits"
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
        if (source === "typed") setManualError(found.error)
        else notify.danger(found.error)
        return
      }
      navigator.vibrate?.(60)
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
      if (done.ok && done.handedOver) {
        navigator.vibrate?.([80, 60, 80])
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
    <div className="flex flex-col gap-10">
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
  const remaining = order.items.filter((item) => !item.pickedUp).length
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Each new result takes focus, so screen readers announce it.
  useEffect(() => headingRef.current?.focus(), [result])

  return (
    <section aria-labelledby="hasil" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="type-kicker text-accent-text">{order.campaignName}</p>
        <div className="flex flex-wrap items-center gap-4">
          <h2
            id="hasil"
            tabIndex={-1}
            ref={headingRef}
            className="type-display-lg text-text outline-none"
          >
            {order.code}
          </h2>
          <OrderStatusBadge status={order.shownStatus} />
        </div>
        {order.buyerName && (
          <p className="type-body text-text">
            {order.buyerName} <span className="text-muted">· WeChat {order.wechatId}</span>
          </p>
        )}
      </div>

      <StatusAlert result={result} order={order} remaining={remaining} />

      {order.delivery && order.status === "paid" && (
        <Alert variant="warning">
          <AlertTitle>Delivery order · {order.delivery.slot}</AlertTitle>
          <AlertDescription>
            Meant to be delivered to {order.delivery.address}. If the buyer is picking it up, hand over everything
            sekaligus.
          </AlertDescription>
        </Alert>
      )}

      <Card variant="outline">
        <CardContent>
          {canHandOver && <p className="mb-3 type-ui text-text">Tick the items you hand over</p>}
          <ul className="flex flex-col">
            {order.items.map((item, i) => {
              const label = `${item.qty}× ${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ""}`
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
          >
            <CheckIcon aria-hidden weight="bold" />
            {handing ? "Saving…" : `Hand over ${selectedQty} ${selectedQty === 1 ? "item" : "items"}`}
          </Button>
        )}
        <Button variant={canHandOver ? "secondary" : "primary"} size="lg" onClick={onNext}>
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

function StatusAlert({
  result,
  order,
  remaining,
}: {
  result: ScanResult
  order: ScannedOrder
  remaining: number
}) {
  if (result.ok && result.handedOver) {
    return (
      <Alert variant="success" live>
        <AlertTitle>{result.handedOver} {result.handedOver === 1 ? "item" : "items"} handed over</AlertTitle>
        <AlertDescription>
          {remaining === 0
            ? "Order complete."
            : `${remaining} more ${remaining === 1 ? "line is" : "lines are"} still to collect. Scan again when the buyer comes back.`}
        </AlertDescription>
      </Alert>
    )
  }

  const alert = (() => {
    switch (order.status) {
      case "paid":
        return result.ok ? null : <Problem title="Can't hand over yet" text={result.error} />
      case "picked_up":
        return (
          <Alert variant="danger" live>
            <AlertTitle>Already picked up. Don't hand it over again.</AlertTitle>
            <AlertDescription>
              {order.pickedUpAt && `Handed over ${when(order.pickedUpAt)} by ${order.handledByName ?? "staff"}. `}
              If the buyer says they didn't get it, call a Danus admin.
            </AlertDescription>
          </Alert>
        )
      case "awaiting_verification":
        return (
          <Alert variant="warning" live>
            <AlertTitle>Payment not checked yet</AlertTitle>
            <AlertDescription>
              {order.canVerify ? (
                <>
                  The transfer proof has been sent.{" "}
                  <NextLink href={`/staff/orders/${order.id}`} className="underline">
                    Check the payment
                  </NextLink>
                  , then scan again.
                </>
              ) : (
                "The transfer proof has been sent but not checked. Ask a Danus admin to check it, then scan again."
              )}
            </AlertDescription>
          </Alert>
        )
      case "pending_payment":
        return (
          <Problem
            title="Not paid"
            text="The buyer hasn't sent a transfer proof. Ask them to pay and send the proof from their order page, or buy at the kasir."
          />
        )
      case "expired":
        return (
          <Problem
            title="Expired"
            text="The order was canceled automatically because it wasn't paid in time. The buyer can buy at the kasir."
          />
        )
      case "cancelled":
        return <Problem title="Canceled" text="Danus has canceled this order." />
    }
  })()

  return alert
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <Alert variant="danger" live>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  )
}
