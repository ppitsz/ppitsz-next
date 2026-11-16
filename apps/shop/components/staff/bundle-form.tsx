"use client"

import { useRouter } from "next/navigation"
import { startTransition, useActionState, useState, useTransition } from "react"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
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
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { formatYuan } from "@ppitsz/ui/lib/format"
import type { ActionState } from "@/lib/actions/state"
import { deleteBundleAction, saveBundleAction } from "@/lib/actions/admin"
import { checkBundleEdit, MAX_COMPONENT_QTY, type BundleEdit } from "@/lib/domain/bundle"
import { MAX_BUNDLE_COMPONENTS } from "@/lib/domain/cart"
import { MAX_SORT_ORDER } from "@/lib/domain/product"
import type { Bundle } from "@/lib/domain/types"
import { ImageField, KEEP_IMAGE, setImage, type ImageChoice } from "./image-field"

/** A product a bundle can hold, with what it costs on its own. */
export interface BundleFormProduct {
  id: string
  name: string
  active: boolean
  /** The cheapest of its variants. */
  fromFen: number
}

interface ComponentRow {
  /** React key; stable for new rows too. */
  key: string
  productId: string
  qty: string
}

const newRow = (): ComponentRow => ({ key: crypto.randomUUID(), productId: "", qty: "1" })

function parsePrice(text: string) {
  const value = Number(text.replace(",", ".").trim())
  return text.trim() && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null
}

function parseCount(text: string) {
  const value = Number(text.trim())
  return text.trim() && Number.isInteger(value) && value >= 0 ? value : null
}

export function BundleForm({
  campaignId,
  bundle,
  products,
  defaultSortOrder,
}: {
  campaignId: string
  bundle: (Bundle & { imageUrl?: string }) | null
  products: BundleFormProduct[]
  defaultSortOrder: number
}) {
  const router = useRouter()
  const [name, setName] = useState(bundle?.name ?? "")
  const [description, setDescription] = useState(bundle?.description ?? "")
  const [price, setPrice] = useState(bundle ? String(bundle.priceFen / 100) : "")
  const [active, setActive] = useState(bundle?.active ?? true)
  const [sortOrder, setSortOrder] = useState(String(defaultSortOrder))
  const [image, setImageChoice] = useState<ImageChoice>(KEEP_IMAGE)
  const [rows, setRows] = useState<ComponentRow[]>(
    bundle
      ? bundle.components.map((c, i) => ({ key: `${i}-${c.productId}`, productId: c.productId, qty: String(c.qty) }))
      : [newRow(), newRow()]
  )
  const [errors, setErrors] = useState<{ name?: string; price?: string; rows: string[]; form?: string }>({
    rows: [],
  })

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveBundleAction(campaignId, bundle?.id ?? null, prev, formData)
      if (result.done) {
        notify.success(bundle ? "Changes saved." : "Bundle added.")
        router.push("/staff/products")
      }
      return result
    },
    {}
  )

  const byId = new Map(products.map((p) => [p.id, p]))
  const separately = rows.reduce((sum, r) => {
    const product = byId.get(r.productId)
    const qty = parseCount(r.qty)
    return product && qty ? sum + product.fromFen * qty : sum
  }, 0)
  const priceFen = parsePrice(price)

  function update(key: string, patch: Partial<ComponentRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const edit: BundleEdit = {
      name: name.trim(),
      description: description.trim(),
      priceFen: priceFen ?? 0,
      active,
      sortOrder: Math.min(parseCount(sortOrder) ?? defaultSortOrder, MAX_SORT_ORDER),
      components: rows.map((r) => ({ productId: r.productId, qty: parseCount(r.qty) ?? 0 })),
    }

    const next: typeof errors = { rows: [] }
    if (priceFen === null) next.price = "Write the price in yuan, like 88 or 99.5."
    for (const issue of checkBundleEdit(edit, new Set(byId.keys()))) {
      if (issue.index !== undefined) next.rows[issue.index] ??= issue.message
      else if (issue.field === "name") next.name ??= issue.message
      else if (issue.field === "priceFen") next.price ??= issue.message
      else next.form ??= issue.message
    }
    setErrors(next)
    if (next.name || next.price || next.form || next.rows.some(Boolean)) return

    const formData = new FormData()
    formData.set("data", JSON.stringify(edit))
    await setImage(formData, "photo", image)
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-10" noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="bundle-name">Bundle name</FieldLabel>
          <Input
            id="bundle-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            aria-invalid={!!errors.name || undefined}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="bundle-description">Description</FieldLabel>
          <Textarea
            id="bundle-description"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <ImageField
          id="bundle-photo"
          label="Bundle photo"
          helper="Square photos look neatest. Resized automatically before upload."
          currentUrl={bundle?.imageUrl}
          choice={image}
          onChange={setImageChoice}
          alt={`Photo of ${name || "the bundle"}`}
        />
      </FieldGroup>

      <FieldSet className="gap-4">
        <FieldLegend>Bundle contents</FieldLegend>
        <FieldDescription>
          Its stock comes from the products inside. Buyers pick the size or flavor of each product. For two shirts
          that may differ in size, add the shirt twice.
        </FieldDescription>
        <ul className="flex flex-col gap-4">
          {rows.map((row, i) => {
            const error = errors.rows[i]
            const prefix = `item-${row.key}`
            return (
              <li key={row.key} className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${prefix}-product`} className="type-ui text-text">
                      Product
                    </label>
                    <NativeSelect
                      id={`${prefix}-product`}
                      value={row.productId}
                      onChange={(e) => update(row.key, { productId: e.target.value })}
                      aria-invalid={!!error || undefined}
                    >
                      <NativeSelectOption value="">Choose a product</NativeSelectOption>
                      {products.map((p) => (
                        <NativeSelectOption key={p.id} value={p.id}>
                          {p.name}
                          {p.active ? "" : " (not sold on its own)"}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${prefix}-qty`} className="type-ui text-text">
                      Quantity
                    </label>
                    <Input
                      id={`${prefix}-qty`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={row.qty}
                      onChange={(e) => update(row.key, { qty: e.target.value })}
                      aria-invalid={!!error || undefined}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {error ? (
                    <span role="alert" className="type-caption text-danger-text">
                      {error}
                    </span>
                  ) : (
                    <span className="type-caption text-muted">At most {MAX_COMPONENT_QTY} per product</span>
                  )}
                  {rows.length > 1 && (
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    >
                      <TrashIcon aria-hidden />
                      Keluarkan{byId.get(row.productId) ? ` ${byId.get(row.productId)!.name}` : ""}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {rows.length < MAX_BUNDLE_COMPONENTS && (
          <Button variant="secondary" className="self-start" onClick={() => setRows((current) => [...current, newRow()])}>
            <PlusIcon aria-hidden />
            Add a product to the bundle
          </Button>
        )}
      </FieldSet>

      <FieldGroup>
        <Field data-invalid={!!errors.price || undefined}>
          <FieldLabel htmlFor="bundle-price">Bundle price (¥)</FieldLabel>
          <Input
            id="bundle-price"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="max-w-40"
            aria-invalid={!!errors.price || undefined}
            aria-describedby="bundle-price-helper"
          />
          <FieldDescription id="bundle-price-helper">
            {separately > 0
              ? `Bought separately from ${formatYuan(separately)}${
                  priceFen !== null && priceFen < separately ? `, so buyers save ${formatYuan(separately - priceFen)}` : ""
                }.`
              : "Choose the contents to see their separate price."}
          </FieldDescription>
          {errors.price && <FieldError>{errors.price}</FieldError>}
        </Field>

        <Field orientation="horizontal">
          <Checkbox id="bundle-for-sale" checked={active} onCheckedChange={setActive} aria-describedby="bundle-for-sale-helper" />
          <FieldContent>
            <FieldLabel htmlFor="bundle-for-sale">For sale</FieldLabel>
            <FieldDescription id="bundle-for-sale-helper">
              Shown in the catalog and the register. Untick to hide the bundle without deleting it.
            </FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="bundle-order">Order</FieldLabel>
          <Input
            id="bundle-order"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="max-w-28"
            aria-describedby="bundle-order-helper"
          />
          <FieldDescription id="bundle-order-helper">Lower numbers show first under Bundles.</FieldDescription>
        </Field>
      </FieldGroup>

      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {(errors.form || errors.rows.some(Boolean)) && (
        <p role="alert" className="type-body-sm text-danger-text">
          {errors.form ?? "Some of the bundle isn't right yet. See the notes in red above."}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="self-start">
        {pending ? "Saving…" : bundle ? "Save changes" : "Add bundle"}
      </Button>
    </form>
  )
}

/** Deletes a bundle. Orders keep what their bundles held, so this is always allowed. */
export function DeleteBundleButton({
  campaignId,
  bundleId,
  name,
}: {
  campaignId: string
  bundleId: string
  name: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, startDelete] = useTransition()

  function remove() {
    startDelete(async () => {
      const result = await deleteBundleAction(campaignId, bundleId)
      if (result.error) {
        notify.danger(result.error)
        return
      }
      setOpen(false)
      notify.success(`${name} deleted.`)
      router.push("/staff/products")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="danger" />}>Delete bundle</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The bundle leaves the catalog and the register. Its products and existing orders don't change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction loading={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete bundle"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
