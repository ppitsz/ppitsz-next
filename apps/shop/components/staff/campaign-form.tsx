"use client"

import { useRouter } from "next/navigation"
import { startTransition, useActionState, useState } from "react"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { notify } from "@ppitsz/ui/components/sonner"
import type { ActionState } from "@/lib/actions/state"
import { saveCampaignAction } from "@/lib/actions/admin"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { STATUSES } from "@ppitsz/ui/lib/network"
import { MAX_TAGLINE_LENGTH, suggestSlug } from "@/lib/domain/campaign"
import { MAX_PICKUP_POINTS, MAX_PLACE_LENGTH } from "@/lib/domain/pickup"
import { CAMPAIGN_STATUSES, type CampaignOffers, type CampaignStatus, type PaymentAccount } from "@/lib/domain/types"
import { ImageField, imageForUpload, KEEP_IMAGE, setImage, type ImageChoice } from "./image-field"

type AccountMethod = PaymentAccount["method"]
const ACCOUNT_METHODS: AccountMethod[] = ["wechat", "alipay", "bank"]

export interface CampaignFormValues {
  name: string
  slug: string
  codePrefix: string
  tagline: string
  coverImageUrl?: string
  /** The product in the homepage hero; "" for none (the cover photo shows). */
  featuredProductId: string
  sortOrder: number
  status: CampaignStatus
  boothInfo: string
  pickupPoints: PointRow[]
  /** "2027-03-15T23:59", Shenzhen time; empty for no limit. */
  onlineOpensAt: string
  onlineClosesAt: string
  offers: CampaignOffers
  /** "5" or "5.50"; the form's own text. */
  deliveryFee: string
  deliverySlots: SlotRow[]
  paymentWindowMinutes: number
  accounts: { id: string; method: AccountMethod; holder: string; detail: string; qrImageUrl?: string }[]
}

type AccountRow = CampaignFormValues["accounts"][number] & { qr: ImageChoice }

/** A delivery slot as typed: "2027-03-13", "15:00", "18:00", and a limit or "". */
export interface SlotRow {
  id: string
  date: string
  from: string
  to: string
  maxOrders: string
}

/** A pickup point as typed: a place, "2027-03-13", "15:00" and "18:00". */
export interface PointRow {
  id: string
  place: string
  date: string
  from: string
  to: string
}

const OFFER_LABELS: Record<keyof CampaignOffers, { label: string; help: string }> = {
  delivery: { label: "Delivery", help: "Online orders are delivered to the buyer's address, by us or a courier." },
  pickup: { label: "Pickup", help: "Online orders are picked up at a pickup point the buyer chooses, with a QR code." },
  booth: { label: "Booth", help: "Sell in person at the register. Without a booth, all stock can be ordered online." },
}

const DETAIL_LABELS: Record<AccountMethod, string> = {
  wechat: "WeChat ID",
  alipay: "Alipay account",
  bank: "Bank and account number",
}

const STATUS_HELP: Record<CampaignStatus, string> = {
  draft: "Not shown to buyers yet. Staff can open the catalog to check it.",
  open: "Shown on the main page. The online ordering dates decide when buyers can order.",
  closed: "Off the main page, with no checkout. Its orders can still be opened and picked up.",
}

function newAccountId() {
  return crypto.randomUUID().slice(0, 8)
}

/** "5", "5.5", "5,5" → fen; null when empty or not a number. */
function parseYuan(text: string) {
  const value = Number(text.replace(",", ".").trim())
  return text.trim() && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
}

function newSlot(previous: SlotRow | undefined): SlotRow {
  return { id: newAccountId(), date: previous?.date ?? "", from: previous?.from ?? "15:00", to: previous?.to ?? "18:00", maxOrders: "" }
}

function newPoint(previous: PointRow | undefined): PointRow {
  return { id: newAccountId(), place: previous?.place ?? "", date: previous?.date ?? "", from: previous?.from ?? "15:00", to: previous?.to ?? "18:00" }
}

/**
 * A campaign's settings. `campaignId` null makes a new one; `locked` (it has
 * orders) fixes its URL name and code prefix, so links and codes stay valid.
 */
export function CampaignForm({
  campaignId,
  values,
  locked = false,
  copySources = [],
  products = [],
  host,
}: {
  campaignId: string | null
  values: CampaignFormValues
  /** The shop's address without its scheme, for the URL name hint. */
  host: string
  locked?: boolean
  /** For a new campaign: campaigns whose payment accounts it can start with. */
  copySources?: { id: string; name: string }[]
  /** The campaign's products, to pick the featured one from. */
  products?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const isNew = campaignId === null
  const [name, setName] = useState(values.name)
  const [slug, setSlug] = useState(values.slug)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [codePrefix, setCodePrefix] = useState(values.codePrefix)
  const [tagline, setTagline] = useState(values.tagline)
  const [cover, setCover] = useState<ImageChoice>(KEEP_IMAGE)
  const [featuredId, setFeaturedId] = useState(values.featuredProductId)
  const [sortOrder, setSortOrder] = useState(String(values.sortOrder))
  const [status, setStatus] = useState<CampaignStatus>(values.status)
  const [boothInfo, setBoothInfo] = useState(values.boothInfo)
  const [points, setPoints] = useState(values.pickupPoints)
  const [opensAt, setOpensAt] = useState(values.onlineOpensAt)
  const [closesAt, setClosesAt] = useState(values.onlineClosesAt)
  const [offers, setOffers] = useState(values.offers)
  const [deliveryFee, setDeliveryFee] = useState(values.deliveryFee)
  const [slots, setSlots] = useState(values.deliverySlots)
  const [windowMinutes, setWindowMinutes] = useState(String(values.paymentWindowMinutes))
  const [copyFrom, setCopyFrom] = useState("")
  const [accounts, setAccounts] = useState<AccountRow[]>(values.accounts.map((a) => ({ ...a, qr: KEEP_IMAGE })))

  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveCampaignAction(campaignId, prev, formData)
    if (result.done) {
      notify.success(isNew ? "Campaign created. Now add its products." : "Settings saved.")
      // Otherwise the action has already re-rendered this page, and the
      // page remounts the form with what was stored (see its key).
      if (isNew) router.push("/staff/products")
    }
    return result
  }, {})

  function update(id: string, patch: Partial<AccountRow>) {
    setAccounts((current) => current.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function updateSlot(id: string, patch: Partial<SlotRow>) {
    setSlots((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function updatePoint(id: string, patch: Partial<PointRow>) {
    setPoints((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set(
      "data",
      JSON.stringify({
        name,
        slug: slug.trim().toLowerCase(),
        codePrefix: codePrefix.trim().toUpperCase(),
        tagline,
        featuredProductId: featuredId,
        sortOrder: Number(sortOrder),
        status,
        boothInfo,
        pickupPoints: points.map((p) => ({
          id: p.id,
          place: p.place,
          startsAt: `${p.date}T${p.from}`,
          endsAt: `${p.date}T${p.to}`,
        })),
        onlineOpensAt: opensAt,
        onlineClosesAt: closesAt,
        offers,
        // Unreadable text becomes -1, which the rules turn into a message.
        deliveryFeeFen: parseYuan(deliveryFee) ?? -1,
        deliverySlots: slots.map((s) => ({
          id: s.id,
          startsAt: `${s.date}T${s.from}`,
          endsAt: `${s.date}T${s.to}`,
          maxOrders: s.maxOrders.trim() ? Number(s.maxOrders) : null,
        })),
        paymentWindowMinutes: Number(windowMinutes),
        copyAccountsFrom: copyFrom || undefined,
        accounts: accounts.map(({ id, method, holder, detail, qr }) => ({
          id,
          method,
          holder,
          detail,
          removeQr: qr.kind === "remove",
        })),
      })
    )
    for (const account of accounts) {
      const file = await imageForUpload(account.qr)
      if (file) formData.set(`qr-${account.id}`, file)
    }
    await setImage(formData, "cover", cover)
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-10" noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="campaign-name">Campaign name</FieldLabel>
          <Input
            id="campaign-name"
            value={name}
            maxLength={60}
            placeholder="GumamChan · SZ Cup 2027"
            onChange={(e) => {
              setName(e.target.value)
              if (!slugTouched) setSlug(suggestSlug(e.target.value))
            }}
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field>
            <FieldLabel htmlFor="slug">URL name</FieldLabel>
            <Input
              id="slug"
              value={slug}
              maxLength={40}
              disabled={locked}
              placeholder="gumamchan"
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              aria-describedby="slug-helper"
            />
            <FieldDescription id="slug-helper">
              {locked
                ? `${host}/${slug} · can't change once there are orders.`
                : `${host}/${slug || "…"} · lowercase letters, numbers and hyphens.`}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="prefix">Code prefix</FieldLabel>
            <Input
              id="prefix"
              value={codePrefix}
              maxLength={3}
              disabled={locked}
              placeholder="GC"
              onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
              aria-describedby="prefix-helper"
            />
            <FieldDescription id="prefix-helper">{`${codePrefix || "GC"}-7K3P`}</FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
          <Input
            id="tagline"
            value={tagline}
            maxLength={MAX_TAGLINE_LENGTH}
            placeholder="Indonesian home cooking. Order ahead, pick up at the booth."
            onChange={(e) => setTagline(e.target.value)}
            aria-describedby="tagline-helper"
          />
          <FieldDescription id="tagline-helper">One sentence on the main page card and above the catalog.</FieldDescription>
        </Field>
        <ImageField
          id="cover"
          label="Cover photo"
          helper="For the main page card. Wide (3:2) photos look neatest."
          currentUrl={values.coverImageUrl}
          choice={cover}
          onChange={setCover}
          alt={`Cover of ${name || "the campaign"}`}
        />
        {products.length > 0 && (
          <Field>
            <FieldLabel htmlFor="featured" optional>
              Featured product
            </FieldLabel>
            <NativeSelect id="featured" value={featuredId} onChange={(e) => setFeaturedId(e.target.value)}>
              <NativeSelectOption value="">None, show the cover photo</NativeSelectOption>
              {products.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              Shown large on the main page, with its stock left and the bundles that hold it, while this campaign is first
              among the open ones.
            </FieldDescription>
          </Field>
        )}

        <FieldSet>
          <FieldLegend>Status</FieldLegend>
          <RadioGroup value={status} onValueChange={(v) => setStatus(v as CampaignStatus)} className="gap-3">
            {CAMPAIGN_STATUSES.map((s) => (
              <FieldLabel key={s} htmlFor={`status-${s}`}>
                <Field orientation="horizontal">
                  <RadioGroupItem value={s} id={`status-${s}`} />
                  <FieldContent>
                    <span className="type-ui text-text">{STATUSES.campaign[s].label}</span>
                    <FieldDescription>{STATUS_HELP[s]}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="campaign-order">Order</FieldLabel>
          <Input
            id="campaign-order"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="max-w-28"
            aria-describedby="campaign-order-helper"
          />
          <FieldDescription id="campaign-order-helper">Lower numbers show first on the main page.</FieldDescription>
        </Field>

        <FieldSet>
          <FieldLegend>Ways to sell</FieldLegend>
          <FieldDescription>Choose at least one.</FieldDescription>
          <div className="flex flex-col gap-3">
            {(["delivery", "pickup", "booth"] as const).map((key) => (
              <FieldLabel key={key} htmlFor={`cara-${key}`}>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`cara-${key}`}
                    checked={offers[key]}
                    onCheckedChange={(checked) => setOffers((current) => ({ ...current, [key]: checked === true }))}
                  />
                  <FieldContent>
                    <span className="type-ui text-text">{OFFER_LABELS[key].label}</span>
                    <FieldDescription>{OFFER_LABELS[key].help}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </div>
        </FieldSet>

        {offers.booth && (
          <Field>
            <FieldLabel htmlFor="booth">Booth place and time</FieldLabel>
            <Input
              id="booth"
              value={boothInfo}
              maxLength={120}
              placeholder="PPIT booth at SZ Cup · Wed, Mar 17, 2027, 09:00–17:00"
              onChange={(e) => setBoothInfo(e.target.value)}
              aria-describedby="booth-helper"
            />
            <FieldDescription id="booth-helper">Where buyers can buy in person. Shown in the catalog.</FieldDescription>
          </Field>
        )}

        {offers.pickup && (
          <FieldSet className="gap-4">
            <FieldLegend>Pickup points</FieldLegend>
            <FieldDescription>
              Buyers pick one at checkout, and it shows next to their QR code. A point can't be picked once it has
              started. To limit a product to some pickup points, edit the product.
            </FieldDescription>
            <ul className="flex flex-col gap-4">
              {points.map((point, i) => (
                <li key={point.id} className="flex flex-col gap-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-heading-sm text-text">Pickup point {i + 1}</span>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setPoints((current) => current.filter((p) => p.id !== point.id))}
                    >
                      <TrashIcon aria-hidden />
                      Remove pickup point {i + 1}
                    </Button>
                  </div>
                  <Field>
                    <FieldLabel htmlFor={`place-${point.id}`}>Place</FieldLabel>
                    <Input
                      id={`place-${point.id}`}
                      value={point.place}
                      maxLength={MAX_PLACE_LENGTH}
                      placeholder="PPIT booth at SZ Cup"
                      onChange={(e) => updatePoint(point.id, { place: e.target.value })}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
                    <Field>
                      <FieldLabel htmlFor={`point-date-${point.id}`}>Date</FieldLabel>
                      <Input
                        id={`point-date-${point.id}`}
                        type="date"
                        value={point.date}
                        onChange={(e) => updatePoint(point.id, { date: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`point-from-${point.id}`}>From</FieldLabel>
                      <Input
                        id={`point-from-${point.id}`}
                        type="time"
                        value={point.from}
                        onChange={(e) => updatePoint(point.id, { from: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`point-until-${point.id}`}>Until</FieldLabel>
                      <Input
                        id={`point-until-${point.id}`}
                        type="time"
                        value={point.to}
                        onChange={(e) => updatePoint(point.id, { to: e.target.value })}
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            {points.length < MAX_PICKUP_POINTS && (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setPoints((current) => [...current, newPoint(current.at(-1))])}
              >
                <PlusIcon aria-hidden />
                Add a pickup point
              </Button>
            )}
          </FieldSet>
        )}

        {offers.delivery && (
          <FieldSet className="gap-4">
            <FieldLegend>Delivery</FieldLegend>
            <Field>
              <FieldLabel htmlFor="delivery-fee">Delivery fee (¥)</FieldLabel>
              <Input
                id="delivery-fee"
                inputMode="decimal"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="max-w-28"
                aria-describedby="delivery-fee-helper"
              />
              <FieldDescription id="delivery-fee-helper">
                Once per order, added to its total. 0 for free delivery.
              </FieldDescription>
            </Field>
            <FieldDescription>
              Delivery slots: buyers pick one at checkout. A slot that has started or is full can't be
              picked. An empty limit means no limit.
            </FieldDescription>
            <ul className="flex flex-col gap-4">
              {slots.map((slot, i) => (
                <li key={slot.id} className="flex flex-col gap-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-heading-sm text-text">Slot {i + 1}</span>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setSlots((current) => current.filter((s) => s.id !== slot.id))}
                    >
                      <TrashIcon aria-hidden />
                      Remove slot {i + 1}
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem]">
                    <Field>
                      <FieldLabel htmlFor={`date-${slot.id}`}>Date</FieldLabel>
                      <Input
                        id={`date-${slot.id}`}
                        type="date"
                        value={slot.date}
                        onChange={(e) => updateSlot(slot.id, { date: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`from-${slot.id}`}>From</FieldLabel>
                      <Input
                        id={`from-${slot.id}`}
                        type="time"
                        value={slot.from}
                        onChange={(e) => updateSlot(slot.id, { from: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`until-${slot.id}`}>Until</FieldLabel>
                      <Input
                        id={`until-${slot.id}`}
                        type="time"
                        value={slot.to}
                        onChange={(e) => updateSlot(slot.id, { to: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`limit-${slot.id}`} optional>
                        Limit
                      </FieldLabel>
                      <Input
                        id={`limit-${slot.id}`}
                        inputMode="numeric"
                        value={slot.maxOrders}
                        placeholder="No limit"
                        onChange={(e) => updateSlot(slot.id, { maxOrders: e.target.value })}
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            {slots.length < 20 && (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setSlots((current) => [...current, newSlot(current.at(-1))])}
              >
                <PlusIcon aria-hidden />
                Add a delivery slot
              </Button>
            )}
          </FieldSet>
        )}

        {(offers.delivery || offers.pickup) && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="opens" optional>
                  Online ordering opens
                </FieldLabel>
                <Input id="opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="closes" optional>
                  Online ordering closes
                </FieldLabel>
                <Input id="closes" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              </Field>
            </div>
            <p className="-mt-4 type-caption text-muted">
              Shenzhen time. Leave empty to take orders for as long as the campaign is Open.
            </p>
          </>
        )}
        <Field>
          <FieldLabel htmlFor="payment-window">Payment window (minutes)</FieldLabel>
          <Input
            id="payment-window"
            inputMode="numeric"
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(e.target.value)}
            className="max-w-28"
            aria-describedby="payment-window-helper"
          />
          <FieldDescription id="payment-window-helper">
            Orders without a transfer proof are canceled after this many minutes and their stock released. Applies to
            new orders.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {isNew && copySources.length > 0 && (
        <Field>
          <FieldLabel htmlFor="copy-accounts">Copy payment accounts from</FieldLabel>
          <NativeSelect id="copy-accounts" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-describedby="copy-accounts-helper">
            <NativeSelectOption value="">No, start empty</NativeSelectOption>
            {copySources.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription id="copy-accounts-helper">
            The accounts and their QR codes are copied to the new campaign, then each can be changed on its own. The accounts below are added.
          </FieldDescription>
        </Field>
      )}

      <FieldSet className="gap-4">
        <FieldLegend>Payment accounts</FieldLegend>
        <FieldDescription>
          Buyers pick one when they send their proof. A 收款码 QR code makes transfers faster, and the amount
          can't be mistyped.
        </FieldDescription>
        {accounts.length === 0 && <p className="type-body-sm text-muted">No payment accounts yet.</p>}
        <ul className="flex flex-col gap-4">
          {accounts.map((account, i) => (
            <li key={account.id} className="flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="type-heading-sm text-text">Account {i + 1}</span>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    if (account.qr.kind === "new") URL.revokeObjectURL(account.qr.url)
                    setAccounts((current) => current.filter((a) => a.id !== account.id))
                  }}
                >
                  <TrashIcon aria-hidden />
                  Remove account {i + 1}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`metode-${account.id}`} className="type-ui text-text">
                    Metode
                  </label>
                  <NativeSelect
                    id={`metode-${account.id}`}
                    value={account.method}
                    onChange={(e) => update(account.id, { method: e.target.value as AccountMethod })}
                  >
                    {ACCOUNT_METHODS.map((m) => (
                      <NativeSelectOption key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <Field>
                  <FieldLabel htmlFor={`holder-${account.id}`}>Holder name</FieldLabel>
                  <Input
                    id={`holder-${account.id}`}
                    value={account.holder}
                    maxLength={60}
                    placeholder="Nadia (Treasurer)"
                    onChange={(e) => update(account.id, { holder: e.target.value })}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`detail-${account.id}`}>{DETAIL_LABELS[account.method]}</FieldLabel>
                <Input
                  id={`detail-${account.id}`}
                  value={account.detail}
                  maxLength={80}
                  onChange={(e) => update(account.id, { detail: e.target.value })}
                />
              </Field>
              <ImageField
                id={`qr-${account.id}`}
                label="Payment QR code (收款码)"
                currentUrl={account.qrImageUrl}
                choice={account.qr}
                onChange={(qr) => update(account.id, { qr })}
                alt={`QR ${PAYMENT_METHOD_LABELS[account.method]} ${account.holder}`}
              />
            </li>
          ))}
        </ul>
        {accounts.length < 10 && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() =>
              setAccounts((current) => [
                ...current,
                { id: newAccountId(), method: "wechat", holder: "", detail: "", qr: KEEP_IMAGE },
              ])
            }
          >
            <PlusIcon aria-hidden />
            Add a payment account
          </Button>
        )}
      </FieldSet>

      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="self-start">
        {pending ? "Saving…" : isNew ? "Create campaign" : "Save settings"}
      </Button>
    </form>
  )
}
