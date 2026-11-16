"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
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
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { formatYuan } from "@ppitsz/ui/lib/format"
import type { ActionState } from "@/lib/actions/state"
import { createOrderAction, lookupCheckoutAction } from "@/lib/actions/buyer"
import { slotLabel } from "@/lib/campaign-copy"
import type { Catalog, CatalogSlot } from "@/lib/catalog"
import { MAX_ADDRESS_LENGTH } from "@/lib/domain/delivery"
import { cartSummary } from "@/lib/client/cart-summary"
import type { ProfileFields } from "@/lib/domain/account"
import { getCheckoutId, peekCheckoutId, useAddressDraft, useCart } from "@/lib/client/local-store"

const INITIAL: ActionState = {}

const SLOT_NOTES: Record<CatalogSlot["state"], string> = { open: "", full: "Full", started: "Passed" }

/** `profile` is the signed-in buyer's: the form starts from it, and the order saves it back. */
export function CheckoutForm({ catalog, profile }: { catalog: Catalog; profile: ProfileFields }) {
  const cart = useCart(catalog.campaignId)
  const summary = cartSummary(cart.lines, catalog)
  const [state, action, pending] = useActionState(createOrderAction, INITIAL)
  const { address, setAddress } = useAddressDraft()
  const [contact, setContact] = useState(profile)
  const router = useRouter()
  const hasShortage = summary.lines.some((l) => l.short)
  const hours = catalog.paymentWindowMinutes / 60
  const { offers } = catalog
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(offers.delivery ? "delivery" : "pickup")
  const delivering = fulfillment === "delivery"
  const openSlots = catalog.deliverySlots.filter((s) => s.state === "open")
  const [slotId, setSlotId] = useState(openSlots[0]?.id ?? "")
  const feeFen = delivering ? catalog.deliveryFeeFen : 0
  const noSlot = delivering && !openSlots.some((s) => s.id === slotId)

  // A reload during "Placing order…" loses the server's reply. If the last
  // attempt did create an order, go to it instead of letting the buyer order twice.
  useEffect(() => {
    const checkoutId = peekCheckoutId(catalog.campaignId)
    if (!checkoutId) return
    let active = true
    lookupCheckoutAction(checkoutId)
      .then((path) => {
        if (active && path) router.replace(`${path}?new=1`)
      })
      .catch(() => {
        // Offline or server error: the buyer can still submit, which is idempotent.
      })
    return () => {
      active = false
    }
  }, [catalog.campaignId, router])

  function submit(formData: FormData) {
    // Saved before the request leaves, so it survives a reload mid-submit.
    formData.set("checkoutId", getCheckoutId(catalog.campaignId))
    action(formData)
  }

  const field = (name: keyof ProfileFields) => ({
    value: contact[name],
    onChange: (value: string) => setContact((current) => ({ ...current, [name]: value })),
  })

  if (summary.count === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Your cart is empty.</EmptyTitle>
          <EmptyDescription>
            <Link href={`/${catalog.slug}`}>Choose some products</Link>, then come back here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {catalog.testOrdering && (
        <Alert variant="warning">
          <AlertTitle>Test order</AlertTitle>
          <AlertDescription>
            This campaign is a draft, so this order is a test. It takes stock until it's deleted in Settings.
          </AlertDescription>
        </Alert>
      )}
      <section aria-labelledby="summary" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="summary" className="type-heading-lg text-text">
            Your order
          </h2>
          <Link href={`/${catalog.slug}`} className="type-ui text-accent-text underline-offset-4 hover:underline">
            Edit
          </Link>
        </div>
        <ul className="flex flex-col">
          {summary.lines.map((line) => (
            <li key={line.key} className="flex items-start justify-between gap-4 border-t py-3">
              <span className="flex flex-col">
                <span className="type-body text-text">
                  {line.name}
                  {line.detail && ` · ${line.detail}`}
                </span>
                <span className="type-caption text-muted">
                  {line.qty} × {formatYuan(line.unitFen)}
                </span>
                {line.short && (
                  <span className="type-caption text-danger-text">
                    {line.available === 0
                      ? "Sold out."
                      : line.qty > line.available
                        ? `Tinggal ${line.available}.`
                        : "Its stock is also used by other items in your cart."}{" "}
                    Change the quantity first.
                  </span>
                )}
              </span>
              <span className="type-ui text-text">{formatYuan(line.qty * line.unitFen)}</span>
            </li>
          ))}
          {delivering && (
            <li className="flex items-baseline justify-between gap-4 border-t py-3">
              <span className="type-body text-text">Delivery fee</span>
              <span className="type-ui text-text">{feeFen === 0 ? "Free" : formatYuan(feeFen)}</span>
            </li>
          )}
          <li className="flex items-baseline justify-between gap-4 border-t-2 border-text pt-3">
            <span className="type-ui text-text">Total</span>
            <span className="type-heading-lg text-text">{formatYuan(summary.totalFen + feeFen)}</span>
          </li>
        </ul>
      </section>

      <form action={submit} className="flex flex-col gap-6" noValidate>
        <h2 className="type-heading-lg text-text">Your details</h2>
        <input type="hidden" name="campaignId" value={catalog.campaignId} />
        <input type="hidden" name="fulfillment" value={fulfillment} />
        {delivering && <input type="hidden" name="slotId" value={slotId} />}
        <input
          type="hidden"
          name="cart"
          value={JSON.stringify(summary.lines.map((l) => l.line))}
        />

        <FieldGroup>
          <TextField
            name="name"
            label="Name"
            helper="As on your WeChat, so it's easy to match with your transfer."
            autoComplete="name"
            error={state.fieldErrors?.name}
            {...field("name")}
          />
          <TextField
            name="wechatId"
            label="WeChat ID"
            helper="We contact you here if there's a problem with an order."
            autoComplete="off"
            error={state.fieldErrors?.wechatId}
            {...field("wechatId")}
          />
          <TextField
            name="phone"
            label="Phone number"
            optional={!delivering}
            helper={delivering ? "For whoever delivers your order." : undefined}
            type="tel"
            autoComplete="tel"
            error={state.fieldErrors?.phone}
            {...field("phone")}
          />
        </FieldGroup>
        <p className="-mt-2 type-caption text-muted">
          From your account. Changes here are saved for your next orders too.
        </p>

        {offers.delivery && offers.pickup && (
          <FieldSet>
            <FieldLegend>How you get it</FieldLegend>
            <RadioGroup
              value={fulfillment}
              onValueChange={(v) => setFulfillment(v as "delivery" | "pickup")}
              className="gap-3"
            >
              <FieldLabel htmlFor="get-delivery">
                <Field orientation="horizontal">
                  <RadioGroupItem value="delivery" id="get-delivery" />
                  <FieldContent>
                    <span className="type-ui text-text">Delivery</span>
                    <FieldDescription>
                      To your address, {catalog.deliveryFeeFen === 0 ? "free delivery" : `${formatYuan(catalog.deliveryFeeFen)} delivery`}.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
              <FieldLabel htmlFor="get-pickup">
                <Field orientation="horizontal">
                  <RadioGroupItem value="pickup" id="get-pickup" />
                  <FieldContent>
                    <span className="type-ui text-text">Pickup</span>
                    <FieldDescription>At {catalog.pickupInfo}, with your order's QR code.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </RadioGroup>
          </FieldSet>
        )}

        {delivering ? (
          <>
            <Field data-invalid={!!state.fieldErrors?.address || undefined}>
              <FieldLabel htmlFor="field-address">Delivery address</FieldLabel>
              <Textarea
                id="field-address"
                name="address"
                rows={3}
                maxLength={MAX_ADDRESS_LENGTH}
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                aria-invalid={!!state.fieldErrors?.address || undefined}
                aria-describedby={state.fieldErrors?.address ? "field-address-helper field-address-error" : "field-address-helper"}
              />
              <FieldDescription id="field-address-helper">
                With building and room number, like SZU 粤海 西南区 斋区 5栋 302.
              </FieldDescription>
              {state.fieldErrors?.address && <FieldError id="field-address-error">{state.fieldErrors.address}</FieldError>}
            </Field>

            <FieldSet>
              <FieldLegend>Delivery slot</FieldLegend>
              {openSlots.length === 0 ? (
                <p className="type-body-sm text-danger-text">
                  Every delivery slot is full or has passed.
                  {offers.pickup ? " Choose Pickup." : ""}
                </p>
              ) : (
                <RadioGroup value={slotId} onValueChange={(v) => setSlotId(String(v))} className="gap-3">
                  {catalog.deliverySlots.map((slot) => {
                    const label = slotLabel({ startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) })
                    return (
                      <FieldLabel key={slot.id} htmlFor={`slot-${slot.id}`}>
                        <Field orientation="horizontal" data-disabled={slot.state !== "open" || undefined}>
                          <RadioGroupItem value={slot.id} id={`slot-${slot.id}`} disabled={slot.state !== "open"} />
                          <FieldContent>
                            <span className="type-ui text-text">{label}</span>
                            {slot.state !== "open" && <FieldDescription>{SLOT_NOTES[slot.state]}</FieldDescription>}
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    )
                  })}
                </RadioGroup>
              )}
              {state.fieldErrors?.slotId && <FieldError>{state.fieldErrors.slotId}</FieldError>}
            </FieldSet>
          </>
        ) : (
          <p className="type-body text-text">
            Pick up your order at {catalog.pickupInfo}. Show the QR code that appears once your payment is checked.
          </p>
        )}

        <Alert>
          <AlertTitle>What's next</AlertTitle>
          <AlertDescription>
            You have {hours} hours to transfer and upload your proof of payment. After that,
            the order is canceled automatically and its stock released.
          </AlertDescription>
        </Alert>

        {state.error && (
          <Alert variant="danger" live>
            <AlertTitle>Order not placed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" variant="primary" size="lg" loading={pending} disabled={hasShortage || noSlot}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </div>
  )
}

function TextField({
  name,
  label,
  helper,
  error,
  optional,
  type = "text",
  autoComplete,
  value,
  onChange,
}: {
  name: string
  label: string
  helper?: string
  error?: string
  optional?: boolean
  type?: string
  autoComplete?: string
  value: string
  onChange: (value: string) => void
}) {
  const id = `field-${name}`
  const describedBy = [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(" ")
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={!optional}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy || undefined}
      />
      {helper && <FieldDescription id={`${id}-helper`}>{helper}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}
