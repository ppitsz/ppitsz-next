"use client"

import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"

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
import { Badge } from "@ppitsz/ui/components/badge"
import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ppitsz/ui/components/dialog"
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { Link } from "@ppitsz/ui/components/link"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { notify } from "@ppitsz/ui/components/sonner"
import { formatTime, formatYuan } from "@ppitsz/ui/lib/format"
import { cn } from "@ppitsz/ui/lib/utils"
import {
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  type CatalogBundle,
  type CatalogProduct,
  type CatalogVariant,
} from "@/lib/catalog"
import { sellAction, undoSaleAction, type SaleSummary } from "@/lib/actions/staff"
import { bundlesLeft, contentsLabel } from "@/lib/domain/bundle"
import { lineKey, MAX_QTY_PER_LINE, type CartChoice } from "@/lib/domain/cart"
import { CATEGORIES, type CartLine, type PaymentAccount } from "@/lib/domain/types"
import { cartSummary, fitsOneMore, variantKey } from "@/lib/client/cart-summary"
import { useVisiblePoll } from "@/lib/client/use-visible-poll"
import { BundlePicks, defaultPicks } from "../bundle-picks"

type BoothMethod = "cash" | "wechat" | "alipay"
const METHODS: BoothMethod[] = ["cash", "wechat", "alipay"]
const METHOD_SHORT: Record<BoothMethod, string> = { cash: "Cash", wechat: "WeChat", alipay: "Alipay" }

interface RecentSale extends SaleSummary {
  cancelled?: boolean
}

/** Other register phones and new online orders change the stock: fetch it again every 30 s. */
const stockDelay = () => 30_000

/** "45", "45.5", "45,5" → fen; null when empty or not a number. */
function parseYuan(text: string) {
  const value = Number(text.replace(",", ".").trim())
  return text.trim() && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
}

/**
 * The walk-in sale screen. Stock is what is left after online orders
 * (`remaining`), less what this sale already takes, bundles included.
 */
export function Register({
  campaignId,
  products,
  bundles,
  accounts,
}: {
  /** The page keys the register by campaign: a switch starts an empty sale. */
  campaignId: string
  products: CatalogProduct[]
  bundles: CatalogBundle[]
  accounts: Pick<PaymentAccount, "id" | "method" | "holder">[]
}) {
  const router = useRouter()
  const [lines, setLines] = useState<CartLine[]>([])
  const [method, setMethod] = useState<BoothMethod>("cash")
  const [accountId, setAccountId] = useState<Partial<Record<BoothMethod, string>>>({})
  const [received, setReceived] = useState("")
  // One id per sale attempt: a retry of the same cart can't sell twice.
  const [saleId, setSaleId] = useState(() => crypto.randomUUID())
  const [recent, setRecent] = useState<RecentSale[]>([])
  const [saving, startSave] = useTransition()

  useVisiblePoll(() => router.refresh(), stockDelay)

  const { lines: cart, demand, totalFen, count } = cartSummary(lines, { products, bundles }, "remaining")
  const receivedFen = method === "cash" ? parseYuan(received) : null
  const tooLittle = receivedFen !== null && receivedFen < totalFen
  const hasShortage = cart.some((l) => l.short)
  const methodAccounts = accounts.filter((a) => a.method === method)
  const chosenAccount = accountId[method] ?? methodAccounts[0]?.id

  /** What a variant has left for this sale to take. */
  const leftOf = (productId: string, variant: CatalogVariant) =>
    variant.remaining - (demand.get(variantKey(productId, variant.id)) ?? 0)

  function qtyOf(choice: CartChoice) {
    const wanted = lineKey(choice)
    return lines.find((l) => lineKey(l) === wanted)?.qty ?? 0
  }

  function setQty(choice: CartChoice, qty: number) {
    setSaleId(crypto.randomUUID())
    setLines((current) => {
      const wanted = lineKey(choice)
      const existing = current.findIndex((l) => lineKey(l) === wanted)
      if (qty <= 0) return current.filter((_, i) => i !== existing)
      const line = { ...choice, qty } as CartLine
      if (existing === -1) return [...current, line]
      const copy = current.slice()
      copy[existing] = line
      return copy
    })
  }

  function clear() {
    setLines([])
    setReceived("")
    setSaleId(crypto.randomUUID())
  }

  function save() {
    startSave(async () => {
      const result = await sellAction({
        campaignId,
        saleId,
        method,
        accountId: method === "cash" ? undefined : chosenAccount,
        lines: cart.map((l) => l.line),
      })
      if (!result.ok) {
        notify.danger(result.error)
        return
      }
      const change = receivedFen !== null ? receivedFen - result.sale.totalFen : 0
      notify.success(
        `${result.sale.code} saved · ${formatYuan(result.sale.totalFen)}${change > 0 ? ` · change ${formatYuan(change)}` : ""}`
      )
      setRecent((list) => [result.sale, ...list].slice(0, 10))
      clear()
    })
  }

  return (
    <div className="grid gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:pb-0">
      <div className="flex flex-col gap-8">
        {bundles.length > 0 && (
          <section aria-labelledby="register-bundles" className="flex flex-col gap-3">
            <h2 id="register-bundles" className="type-heading-md text-text">
              Bundles
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {bundles.map((bundle) => (
                <li key={bundle.id}>
                  <BundleTile
                    bundle={bundle}
                    leftOf={leftOf}
                    qtyOf={(picks) => qtyOf({ bundleId: bundle.id, picks })}
                    onAdd={(picks) => {
                      const choice = { bundleId: bundle.id, picks }
                      setQty(choice, qtyOf(choice) + 1)
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {CATEGORIES.map((category) => {
          const inCategory = products.filter((p) => p.category === category)
          if (inCategory.length === 0) return null
          return (
            <section key={category} aria-labelledby={`register-${category}`} className="flex flex-col gap-3">
              <h2 id={`register-${category}`} className="type-heading-md text-text">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {inCategory.flatMap((product) =>
                  product.variants.map((variant) => {
                    const choice = { productId: product.id, variantId: variant.id }
                    return (
                      <li key={variantKey(product.id, variant.id)}>
                        <ProductTile
                          product={product}
                          variant={variant}
                          qty={qtyOf(choice)}
                          left={leftOf(product.id, variant)}
                          onAdd={() => setQty(choice, qtyOf(choice) + 1)}
                        />
                      </li>
                    )
                  })
                )}
              </ul>
            </section>
          )
        })}
      </div>

      <section
        id="sale"
        aria-labelledby="sale-title"
        className="flex flex-col gap-6 rounded-xl border p-5 lg:sticky lg:top-24"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="sale-title" className="type-heading-lg text-text">
            Campaign
          </h2>
          {count > 0 && (
            <Button variant="quiet" size="sm" onClick={clear}>
              <TrashIcon aria-hidden />
              Kosongkan
            </Button>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="type-body-sm text-muted">Tap a product to add it.</p>
        ) : (
          <ul className="flex flex-col">
            {cart.map((line) => {
              const name = `${line.name}${line.detail ? ` · ${line.detail}` : ""}`
              return (
                <li key={line.key} className="flex flex-col gap-2 border-t py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="type-body text-text">{name}</span>
                    <span className="type-ui text-text">{formatYuan(line.qty * line.unitFen)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div role="group" aria-label={`Quantity of ${name}`} className="flex items-center gap-2">
                      <Button size="icon-sm" aria-label="Kurangi" onClick={() => setQty(line.line, line.qty - 1)}>
                        <MinusIcon aria-hidden weight="bold" />
                      </Button>
                      <output aria-live="polite" className="min-w-8 text-center type-heading-sm text-text">
                        {line.qty}
                      </output>
                      <Button
                        size="icon-sm"
                        aria-label="Add one"
                        disabled={!fitsOneMore(line, demand, "remaining")}
                        onClick={() => setQty(line.line, line.qty + 1)}
                      >
                        <PlusIcon aria-hidden weight="bold" />
                      </Button>
                    </div>
                    {line.short && (
                      <span className="type-caption text-danger-text">
                        {line.available === 0
                          ? "Sold out"
                          : line.qty > line.available
                            ? `Tinggal ${line.available}`
                            : "Its stock is used by other items"}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
            <li className="flex items-baseline justify-between gap-4 border-t-2 border-text pt-3">
              <span className="type-ui text-text">Total</span>
              <span className="type-numeral text-text">{formatYuan(totalFen)}</span>
            </li>
          </ul>
        )}

        <FieldSet>
          <FieldLegend>Payment</FieldLegend>
          <RadioGroup
            value={method}
            onValueChange={(value) => setMethod(value as BoothMethod)}
            className="grid-cols-3 gap-2"
          >
            {METHODS.map((m) => (
              <FieldLabel key={m} htmlFor={`metode-${m}`}>
                <Field orientation="horizontal" className="gap-2">
                  <RadioGroupItem value={m} id={`metode-${m}`} />
                  <FieldContent>
                    <span className="type-ui text-text">{METHOD_SHORT[m]}</span>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        {method === "cash" ? (
          <CashCalculator
            totalFen={totalFen}
            received={received}
            onReceived={setReceived}
            receivedFen={receivedFen}
          />
        ) : methodAccounts.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-account" className="type-ui text-text">
              Paid into
            </label>
            <NativeSelect
              id="register-account"
              value={chosenAccount}
              onChange={(e) => setAccountId((current) => ({ ...current, [method]: e.target.value }))}
            >
              {methodAccounts.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.holder}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <p className="type-body-sm text-muted">
            {methodAccounts[0]
              ? `The buyer scans the ${PAYMENT_METHOD_LABELS[method]} QR code of ${methodAccounts[0].holder}. Save once the payment is in.`
              : "Save once the payment is in."}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          loading={saving}
          disabled={count === 0 || hasShortage || tooLittle}
          onClick={save}
        >
          {saving ? "Saving…" : count === 0 ? "Save sale" : `Save sale · ${formatYuan(totalFen)}`}
        </Button>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="flex flex-col gap-3 lg:col-start-1">
          <h2 id="recent" className="type-heading-md text-text">
            Recent sales on this phone
          </h2>
          <ul className="flex flex-col">
            {recent.map((sale) => (
              <RecentRow
                key={sale.id}
                sale={sale}
                onUndone={() =>
                  setRecent((list) => list.map((s) => (s.id === sale.id ? { ...s, cancelled: true } : s)))
                }
              />
            ))}
          </ul>
        </section>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-bg lg:hidden">
          <Container className="flex h-18 items-center justify-between gap-4">
            <p className="flex flex-col">
              <span className="type-caption text-muted">{count} {count === 1 ? "item" : "items"}</span>
              <span className="type-heading-md text-text">{formatYuan(totalFen)}</span>
            </p>
            <Button
              onClick={() =>
                document.getElementById("sale")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              To payment
            </Button>
          </Container>
        </div>
      )}
    </div>
  )
}

const tileClass = (selected: boolean) =>
  cn(
    "relative flex min-h-28 w-full flex-col items-start gap-1 rounded-xl border p-3 text-left",
    "transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong active:translate-y-px",
    "disabled:cursor-not-allowed disabled:bg-surface disabled:hover:bg-surface",
    selected ? "border-2 border-text" : "border-border-strong"
  )

function ProductTile({
  product,
  variant,
  qty,
  left,
  onAdd,
}: {
  product: CatalogProduct
  variant: CatalogVariant
  qty: number
  /** Units still free after what this sale takes, bundles included. */
  left: number
  onAdd: () => void
}) {
  const soldOut = variant.remaining === 0
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={left <= 0 || qty >= MAX_QTY_PER_LINE}
      className={tileClass(qty > 0)}
    >
      <span className="sr-only">Add </span>
      <span className={cn("pr-8 type-ui", soldOut ? "text-subtle" : "text-text")}>{product.name}</span>
      {variant.label && <span className="type-body-sm text-muted">{variant.label}</span>}
      <span className={cn("mt-auto type-heading-sm", soldOut ? "text-subtle" : "text-text")}>
        {formatYuan(variant.priceFen)}
      </span>
      <span className={cn("type-caption", soldOut ? "text-subtle" : left <= 5 ? "text-warning-text" : "text-muted")}>
        {soldOut ? "Sold out" : `${variant.remaining} left`}
      </span>
      {qty > 0 && (
        <Badge variant="highlight" className="absolute top-2 right-2">
          <span className="sr-only">in cart: </span>
          {qty}
        </Badge>
      )}
    </button>
  )
}

/**
 * A bundle at the register. With options to pick (a size), a tap opens a dialog
 * to pick them; otherwise it adds one at once.
 */
function BundleTile({
  bundle,
  leftOf,
  qtyOf,
  onAdd,
}: {
  bundle: CatalogBundle
  leftOf: (productId: string, variant: CatalogVariant) => number
  qtyOf: (picks: string[]) => number
  onAdd: (picks: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [picks, setPicks] = useState<string[]>([])
  const choices = bundle.components.some((c) => c.variants.length > 1)
  const leftOfPick = (v: CatalogVariant, i: number) => leftOf(bundle.components[i]!.productId, v)
  // Without options there is one way to make the bundle.
  const fixedPicks = choices ? null : bundle.components.map((c) => c.variants[0]!.id)

  /** How many more of this bundle the picks can make, after what the sale already takes. */
  const leftFor = (p: string[]) =>
    bundlesLeft(
      bundle.components.map((c, i) => {
        const variant = c.variants.find((v) => v.id === p[i]) ?? c.variants[0]!
        return { key: variantKey(c.productId, variant.id), qty: c.qty, available: leftOf(c.productId, variant) }
      })
    )
  const inSale = fixedPicks ? qtyOf(fixedPicks) : 0
  const tileLeft = fixedPicks ? leftFor(fixedPicks) : 0
  const contents = contentsLabel(bundle.components.map((c) => ({ name: c.name, variantLabel: "", qty: c.qty })))

  function tap() {
    if (fixedPicks) return onAdd(fixedPicks)
    setPicks(defaultPicks(bundle.components, leftOfPick))
    setOpen(true)
  }

  const pickedLeft = picks.length > 0 ? leftFor(picks) : 0
  const pickedQty = picks.length > 0 ? qtyOf(picks) : 0

  return (
    <>
      <button
        type="button"
        onClick={tap}
        disabled={!!fixedPicks && (tileLeft <= 0 || inSale >= MAX_QTY_PER_LINE)}
        className={tileClass(inSale > 0)}
      >
        <span className="sr-only">Add </span>
        <span className="pr-8 type-ui text-text">{bundle.name}</span>
        <span className="type-body-sm text-muted">{contents}</span>
        <span className="mt-auto type-heading-sm text-text">{formatYuan(bundle.priceFen)}</span>
        <span className="type-caption text-muted">{choices ? "Choose a size" : tileLeft <= 0 ? "Sold out" : `${tileLeft} left`}</span>
        {inSale > 0 && (
          <Badge variant="highlight" className="absolute top-2 right-2">
            <span className="sr-only">in cart: </span>
            {inSale}
          </Badge>
        )}
      </button>

      {choices && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{bundle.name}</DialogTitle>
              <DialogDescription>{contents}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <BundlePicks
                idPrefix={`register-${bundle.id}`}
                components={bundle.components}
                picks={picks}
                onChange={setPicks}
                leftOf={leftOfPick}
              />
              <p className="type-caption text-muted">
                {pickedLeft <= 0 ? "These picks are sold out." : `${pickedLeft} bundles left with these picks.`}
              </p>
            </div>
            <DialogFooter showCloseButton>
              <Button
                disabled={pickedLeft <= 0 || pickedQty >= MAX_QTY_PER_LINE}
                onClick={() => {
                  onAdd(picks)
                  setOpen(false)
                }}
              >
                <PlusIcon aria-hidden weight="bold" />
                Add to sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function CashCalculator({
  totalFen,
  received,
  onReceived,
  receivedFen,
}: {
  totalFen: number
  received: string
  onReceived: (value: string) => void
  receivedFen: number | null
}) {
  const quick = [50_00, 100_00].filter((fen) => fen > totalFen)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="cash-received" className="type-ui text-text">
        Cash received <span className="type-body-sm text-muted">(optional)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="cash-received"
          inputMode="decimal"
          autoComplete="off"
          placeholder="¥"
          value={received}
          onChange={(e) => onReceived(e.target.value)}
          className="max-w-32"
        />
        {totalFen > 0 && (
          <Button size="sm" variant="quiet" onClick={() => onReceived(String(totalFen / 100))}>
            Exact amount
          </Button>
        )}
        {totalFen > 0 &&
          quick.map((fen) => (
            <Button key={fen} size="sm" variant="quiet" onClick={() => onReceived(String(fen / 100))}>
              {formatYuan(fen)}
            </Button>
          ))}
      </div>
      {receivedFen !== null && totalFen > 0 && (
        <p aria-live="polite" className={receivedFen < totalFen ? "type-ui text-danger-text" : "type-ui text-text"}>
          {receivedFen < totalFen
            ? `Short ${formatYuan(totalFen - receivedFen)}`
            : `Kembalian ${formatYuan(receivedFen - totalFen)}`}
        </p>
      )}
    </div>
  )
}

function RecentRow({ sale, onUndone }: { sale: RecentSale; onUndone: () => void }) {
  const [open, setOpen] = useState(false)
  const [undoing, startUndo] = useTransition()

  function undo() {
    startUndo(async () => {
      const result = await undoSaleAction(sale.id)
      if (result.error) {
        notify.danger(result.error)
        return
      }
      setOpen(false)
      onUndone()
      notify.success(`${sale.code} undone. Its stock is back.`)
    })
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t py-3">
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-3">
          <Link as={NextLink} href={`/staff/orders/${sale.id}`} variant="standalone">
            {sale.code}
          </Link>
          <span className={cn("type-ui", sale.cancelled ? "text-muted line-through" : "text-text")}>
            {formatYuan(sale.totalFen)}
          </span>
          {sale.cancelled && <Badge variant="neutral">Canceled</Badge>}
        </span>
        <span className="truncate type-caption text-muted">
          {formatTime(sale.at)} · {PAYMENT_METHOD_LABELS[sale.method]} · {sale.items}
        </span>
      </span>
      {!sale.cancelled && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={<Button variant="quiet" size="sm" />}>Undo</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Undo {sale.code}?</AlertDialogTitle>
              <AlertDialogDescription>
                For mistakes. Its stock becomes available again. If the buyer already paid, give back
                their money.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction loading={undoing} onClick={undo}>
                {undoing ? "Undoing…" : "Undo sale"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  )
}
