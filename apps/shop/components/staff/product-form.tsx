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
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import type { ActionState } from "@/lib/actions/state"
import { deleteProductAction, saveProductAction } from "@/lib/actions/admin"
import { CATEGORY_LABELS } from "@/lib/catalog"
import {
  canRemoveVariant,
  checkProductEdit,
  MAX_MEASUREMENT_LENGTH,
  MAX_MEASURE_LENGTH,
  MAX_MEASURES,
  MAX_SIZE_NOTE_LENGTH,
  MAX_SORT_ORDER,
  MAX_TAGS,
  splitList,
  MAX_VARIANTS,
  type ProductEdit,
  type VariantField,
} from "@/lib/domain/product"
import { CATEGORIES, type Category, type Product, type Variant } from "@/lib/domain/types"
import { fromShenzhenInput, toShenzhenInput } from "@/lib/shenzhen-time"
import { ImageField, KEEP_IMAGE, setImage, type ImageChoice } from "./image-field"

interface VariantRow {
  /** React key; stable for new rows too. */
  key: string
  id?: string
  label: string
  price: string
  stock: string
  cap: string
  /** Already taken, from the stored product. */
  onlineOrdered: number
  walkIn: number
  /** This row's values in the size chart, one per measure. */
  measurements: string[]
}

/** The usual columns for a shirt, to start a size chart with. */
const SHIRT_MEASURES = ["Lebar dada", "Panjang badan", "Panjang lengan"]

const fenToText = (fen: number) => String(fen / 100)
const newRow = (measureCount: number): VariantRow => ({
  key: crypto.randomUUID(),
  label: "",
  price: "",
  stock: "",
  cap: "",
  onlineOrdered: 0,
  walkIn: 0,
  measurements: Array<string>(measureCount).fill(""),
})

function parsePrice(text: string) {
  const value = Number(text.replace(",", ".").trim())
  return text.trim() && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null
}

function parseCount(text: string) {
  const value = Number(text.trim())
  return text.trim() && Number.isInteger(value) && value >= 0 ? value : null
}

type RowErrors = Partial<Record<"label" | "price" | "stock" | "cap", string>>

const ROW_FIELD: Record<Exclude<VariantField, "measurements">, keyof RowErrors> = {
  label: "label",
  priceFen: "price",
  stock: "stock",
  onlineCap: "cap",
}

/**
 * Turns the form into a ProductEdit and the errors to show: what can't be
 * read as a number, then the product rules, checked against `stored`.
 */
function toEdit(fields: Omit<ProductEdit, "variants">, rows: VariantRow[], stored: Variant[]) {
  const rowErrors: RowErrors[] = rows.map(() => ({}))
  const variants = rows.map((row, i) => {
    const e = rowErrors[i]!
    const priceFen = parsePrice(row.price)
    const stock = parseCount(row.stock)
    const cap = row.cap.trim() === "" ? null : parseCount(row.cap)
    if (priceFen === null) e.price = "Write the price in yuan, like 15 or 12.5."
    if (stock === null) e.stock = "Write the stock as a whole number."
    if (row.cap.trim() !== "" && cap === null) e.cap = "A whole number, or leave it empty."
    return {
      id: row.id,
      label: row.label.trim(),
      priceFen: priceFen ?? 0,
      stock: stock ?? 0,
      onlineCap: cap,
      measurements: row.measurements,
    }
  })
  const edit: ProductEdit = { ...fields, variants }

  let nameError: string | undefined
  let formError: string | undefined
  let chartError: string | undefined
  let saleError: string | undefined
  let tagsError: string | undefined
  let allergensError: string | undefined
  for (const issue of checkProductEdit(stored, edit)) {
    if (issue.field === "onSale") saleError ??= issue.message
    else if (issue.field === "tags") tagsError ??= issue.message
    else if (issue.field === "allergens") allergensError ??= issue.message
    else if (issue.field === "sizeChart" || issue.field === "measurements") {
      const label = issue.index === undefined ? "" : rows[issue.index]?.label.trim()
      chartError ??= label ? `${label}: ${issue.message}` : issue.message
    } else if (issue.index !== undefined && issue.field in ROW_FIELD) {
      rowErrors[issue.index]![ROW_FIELD[issue.field as keyof typeof ROW_FIELD]] ??= issue.message
    } else if (issue.field === "name") nameError ??= issue.message
    else formError ??= issue.message
  }
  const ok =
    !nameError &&
    !formError &&
    !chartError &&
    !saleError &&
    !tagsError &&
    !allergensError &&
    rowErrors.every((e) => Object.keys(e).length === 0)
  return { ok, edit, rowErrors, nameError, formError, chartError, saleError, tagsError, allergensError }
}

export function ProductForm({
  campaignId,
  product,
  defaultSortOrder,
  hasBooth = true,
}: {
  campaignId: string
  product: (Product & { imageUrl?: string; sizeChartUrl?: string }) | null
  defaultSortOrder: number
  /** Without a booth there is nothing to keep stock for, so the online cap is hidden (and ignored). */
  hasBooth?: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [category, setCategory] = useState<Category>(product?.category ?? "food")
  const [active, setActive] = useState(product?.active ?? true)
  const [sortOrder, setSortOrder] = useState(String(defaultSortOrder))
  /** "2027-03-01T00:00", Shenzhen time; empty for no limit. */
  const [saleFrom, setSaleFrom] = useState(product?.onSaleFrom ? toShenzhenInput(product.onSaleFrom) : "")
  const [saleUntil, setSaleUntil] = useState(product?.onSaleUntil ? toShenzhenInput(product.onSaleUntil) : "")
  const [saleError, setSaleError] = useState<string>()
  /** As typed: "New, Spicy". */
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "")
  const [allergens, setAllergens] = useState(product?.allergens.join(", ") ?? "")
  const [tagsError, setTagsError] = useState<string>()
  const [allergensError, setAllergensError] = useState<string>()
  const [image, setImageChoice] = useState<ImageChoice>(KEEP_IMAGE)
  const [sizeChart, setSizeChart] = useState<ImageChoice>(KEEP_IMAGE)
  const [rows, setRows] = useState<VariantRow[]>(
    product
      ? product.variants.map((v) => ({
          key: v.id,
          id: v.id,
          label: v.label,
          price: fenToText(v.priceFen),
          stock: String(v.stock),
          cap: v.onlineCap === null ? "" : String(v.onlineCap),
          onlineOrdered: v.onlineOrdered,
          walkIn: v.walkIn,
          measurements: (product.sizeChart?.measures ?? []).map((_, i) => v.measurements?.[i] ?? ""),
        }))
      : [newRow(0)]
  )
  const [measures, setMeasures] = useState<string[]>(product?.sizeChart?.measures ?? [])
  const [sizeNote, setSizeNote] = useState(product?.sizeChart?.note ?? "")
  const [chartError, setChartError] = useState<string>()
  const [rowErrors, setRowErrors] = useState<RowErrors[]>([])
  const [nameError, setNameError] = useState<string>()
  const [formError, setFormError] = useState<string>()

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveProductAction(campaignId, product?.id ?? null, prev, formData)
      if (result.done) {
        notify.success(product ? "Changes saved." : "Product added.")
        router.push("/staff/products")
      }
      return result
    },
    {}
  )

  function update(key: string, patch: Partial<VariantRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const order = parseCount(sortOrder) ?? defaultSortOrder
    const from = saleFrom ? fromShenzhenInput(saleFrom) : null
    const until = saleUntil ? fromShenzhenInput(saleUntil) : null
    const checked = toEdit(
      {
        name: name.trim(),
        description: description.trim(),
        category,
        active,
        onSaleFrom: from,
        onSaleUntil: until,
        tags: splitList(tags),
        allergens: splitList(allergens),
        sortOrder: Math.min(order, MAX_SORT_ORDER),
        sizeChart: measures.length ? { measures, note: sizeNote } : null,
      },
      rows,
      product?.variants ?? []
    )
    setRowErrors(checked.rowErrors)
    setNameError(checked.nameError)
    setFormError(checked.formError)
    setChartError(checked.chartError)
    setSaleError(checked.saleError)
    setTagsError(checked.tagsError)
    setAllergensError(checked.allergensError)
    if (!checked.ok) return
    const { edit } = checked

    const formData = new FormData()
    formData.set("data", JSON.stringify(edit))
    await setImage(formData, "photo", image)
    await setImage(formData, "sizeChart", sizeChart)
    startTransition(() => action(formData))
  }

  const several = rows.length > 1
  const showSizeChart = category === "merch" || !!product?.sizeChartUrl || measures.length > 0

  function addMeasures(names: string[]) {
    setMeasures((current) => [...current, ...names].slice(0, MAX_MEASURES))
    setRows((current) =>
      current.map((r) => ({ ...r, measurements: [...r.measurements, ...names.map(() => "")].slice(0, MAX_MEASURES) }))
    )
  }

  function removeMeasure(index: number) {
    setMeasures((current) => current.filter((_, i) => i !== index))
    setRows((current) => current.map((r) => ({ ...r, measurements: r.measurements.filter((_, i) => i !== index) })))
  }

  function renameMeasure(index: number, value: string) {
    setMeasures((current) => current.map((m, i) => (i === index ? value : m)))
  }

  function setMeasurement(key: string, index: number, value: string) {
    setRows((current) =>
      current.map((r) =>
        r.key === key ? { ...r, measurements: r.measurements.map((m, i) => (i === index ? value : m)) } : r
      )
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-10" noValidate>
      <FieldGroup>
        <Field data-invalid={!!nameError || undefined}>
          <FieldLabel htmlFor="product-name">Product name</FieldLabel>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            aria-invalid={!!nameError || undefined}
          />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="deskripsi">Description</FieldLabel>
          <Textarea
            id="deskripsi"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-describedby="deskripsi-helper"
          />
          <FieldDescription id="deskripsi-helper">
            Contents, portion, ingredients or halal notes. Shown in the catalog.
          </FieldDescription>
        </Field>

        <FieldSet>
          <FieldLegend>Category</FieldLegend>
          <RadioGroup value={category} onValueChange={(v) => setCategory(v as Category)} className="gap-3">
            {CATEGORIES.map((c) => (
              <FieldLabel key={c} htmlFor={`category-${c}`}>
                <Field orientation="horizontal">
                  <RadioGroupItem value={c} id={`category-${c}`} />
                  <FieldContent>
                    <span className="type-ui text-text">{CATEGORY_LABELS[c]}</span>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <ImageField
          id="product-photo"
          label="Product photo"
          helper="Square photos look neatest. Resized automatically before upload."
          currentUrl={product?.imageUrl}
          choice={image}
          onChange={setImageChoice}
          alt={`Photo of ${name || "the product"}`}
        />

        <Field orientation="horizontal">
          <Checkbox id="for-sale" checked={active} onCheckedChange={setActive} aria-describedby="for-sale-helper" />
          <FieldContent>
            <FieldLabel htmlFor="for-sale">For sale</FieldLabel>
            <FieldDescription id="for-sale-helper">
              Shown in the catalog and the kasir. Untick to hide the product without deleting it.
              Bundles that hold it stay on sale.
            </FieldDescription>
          </FieldContent>
        </Field>

        <FieldSet data-invalid={!!saleError || undefined}>
          <FieldLegend variant="label">Sale dates</FieldLegend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sale-from" optional>
                From
              </FieldLabel>
              <Input id="sale-from" type="datetime-local" value={saleFrom} onChange={(e) => setSaleFrom(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="sale-until" optional>
                Until
              </FieldLabel>
              <Input
                id="sale-until"
                type="datetime-local"
                value={saleUntil}
                onChange={(e) => setSaleUntil(e.target.value)}
              />
            </Field>
          </div>
          <FieldDescription>
            Shenzhen time, for seasonal products. Before the start, it shows in the catalog but can't be ordered;
            after the end, it leaves the catalog and the kasir. Leave empty to sell it while the campaign is open.
          </FieldDescription>
          {saleError && <FieldError>{saleError}</FieldError>}
        </FieldSet>

        <Field data-invalid={!!tagsError || undefined}>
          <FieldLabel htmlFor="product-labels" optional>
            Label
          </FieldLabel>
          <Input
            id="product-labels"
            value={tags}
            placeholder="New, Spicy"
            onChange={(e) => setTags(e.target.value)}
            aria-invalid={!!tagsError || undefined}
            aria-describedby="product-labels-helper"
          />
          <FieldDescription id="product-labels-helper">
            Separate with commas, at most {MAX_TAGS}. Shown on the product card, like New, Spicy, Weekly, Limited.
          </FieldDescription>
          {tagsError && <FieldError>{tagsError}</FieldError>}
        </Field>

        <Field data-invalid={!!allergensError || undefined}>
          <FieldLabel htmlFor="allergens" optional>
            Allergens
          </FieldLabel>
          <Input
            id="allergens"
            value={allergens}
            placeholder="Coconut, May contain shrimp"
            onChange={(e) => setAllergens(e.target.value)}
            aria-invalid={!!allergensError || undefined}
            aria-describedby="allergens-helper"
          />
          <FieldDescription id="allergens-helper">
            Separate with commas. Buyers see them in the catalog and on the main page.
          </FieldDescription>
          {allergensError && <FieldError>{allergensError}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="sort-order">Order</FieldLabel>
          <Input
            id="sort-order"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="max-w-28"
            aria-describedby="order-helper"
          />
          <FieldDescription id="order-helper">Lower numbers show first in their category.</FieldDescription>
        </Field>
      </FieldGroup>

      {showSizeChart && (
        <FieldSet className="gap-4">
          <FieldLegend>Size chart</FieldLegend>
          <FieldDescription>
            Each variant's measurements in cm. Buyers open it from the Size chart button in the catalog and in
            bundles. Leave unknown ones empty.
          </FieldDescription>
          {measures.length === 0 ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => addMeasures(SHIRT_MEASURES)}>
                <PlusIcon aria-hidden />
                Start with shirt columns
              </Button>
              <Button variant="quiet" onClick={() => addMeasures([""])}>
                Add your own column
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border-strong">
                      <th scope="col" className="py-2 pe-4 align-bottom type-sign text-muted">
                        Variant
                      </th>
                      {measures.map((measure, i) => (
                        <th key={i} scope="col" className="py-2 pe-4 align-bottom">
                          <span className="flex items-center gap-1">
                            <Input
                              value={measure}
                              onChange={(e) => renameMeasure(i, e.target.value)}
                              maxLength={MAX_MEASURE_LENGTH}
                              placeholder="Column name"
                              aria-label={`Column ${i + 1} name`}
                              className="w-36"
                            />
                            <Button
                              variant="quiet"
                              size="icon"
                              onClick={() => removeMeasure(i)}
                              aria-label={`Remove column ${measure || i + 1}`}
                            >
                              <TrashIcon aria-hidden />
                            </Button>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b">
                        <th scope="row" className="py-2 pe-4 type-ui text-text">
                          {row.label.trim() || (several ? "New variant" : "One size")}
                        </th>
                        {measures.map((measure, i) => (
                          <td key={i} className="py-2 pe-4">
                            <Input
                              value={row.measurements[i] ?? ""}
                              onChange={(e) => setMeasurement(row.key, i, e.target.value)}
                              maxLength={MAX_MEASUREMENT_LENGTH}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${measure || `Column ${i + 1}`}, ${row.label.trim() || "this variant"}`}
                              className="w-24"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {measures.length < MAX_MEASURES && (
                <Button variant="quiet" className="self-start" onClick={() => addMeasures([""])}>
                  <PlusIcon aria-hidden />
                  Add column
                </Button>
              )}
            </>
          )}
          <Field>
            <FieldLabel htmlFor="fit-note">Fit note</FieldLabel>
            <Textarea
              id="fit-note"
              rows={2}
              maxLength={MAX_SIZE_NOTE_LENGTH}
              value={sizeNote}
              onChange={(e) => setSizeNote(e.target.value)}
              placeholder="Measured flat. Asian sizing: size up if unsure."
              aria-describedby="fit-note-helper"
            />
            <FieldDescription id="fit-note-helper">Shown under the chart. Optional.</FieldDescription>
          </Field>
          <ImageField
            id="size-chart-image"
            label="Size chart image"
            helper="Optional: the maker's chart or a picture of how to measure. Shown under the chart."
            currentUrl={product?.sizeChartUrl}
            choice={sizeChart}
            onChange={setSizeChart}
            alt={`Size chart image for ${name || "the product"}`}
            fit="contain"
          />
          {chartError && (
            <p role="alert" className="type-body-sm text-danger-text">
              {chartError}
            </p>
          )}
        </FieldSet>
      )}

      <FieldSet className="gap-4">
        <FieldLegend>Price and stock</FieldLegend>
        {hasBooth && (
          <FieldDescription>
            Online cap: how many can be ordered on the website. The rest is kept for buyers at the booth.
            Leave empty for no cap, or 0 if it's sold at the booth only.
          </FieldDescription>
        )}
        <ul className="flex flex-col gap-4">
          {rows.map((row, i) => {
            const removable = canRemoveVariant(row)
            const e = rowErrors[i] ?? {}
            const prefix = `varian-${row.key}`
            return (
              <li key={row.key} className="flex flex-col gap-4 rounded-xl border p-4">
                {several && (
                  <NumberField
                    id={`${prefix}-label`}
                    label="Variant name"
                    placeholder="M, Spicy, Chocolate"
                    value={row.label}
                    onChange={(label) => update(row.key, { label })}
                    error={e.label}
                    wide
                  />
                )}
                <div className={hasBooth ? "grid gap-4 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
                  <NumberField
                    id={`${prefix}-price`}
                    label="Price (¥)"
                    inputMode="decimal"
                    value={row.price}
                    onChange={(price) => update(row.key, { price })}
                    error={e.price}
                  />
                  <NumberField
                    id={`${prefix}-stock`}
                    label="Stock"
                    inputMode="numeric"
                    value={row.stock}
                    onChange={(stock) => update(row.key, { stock })}
                    error={e.stock}
                  />
                  {hasBooth && (
                    <NumberField
                      id={`${prefix}-cap`}
                      label="Online cap"
                      inputMode="numeric"
                      placeholder="No limit"
                      value={row.cap}
                      onChange={(cap) => update(row.key, { cap })}
                      error={e.cap}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="type-caption text-muted">
                    {removable
                      ? "No orders yet"
                      : `${row.onlineOrdered} ordered · ${row.walkIn} sold at the booth`}
                  </span>
                  {several &&
                    (!removable ? (
                      <span className="type-caption text-muted">Can't be removed because it's been ordered</span>
                    ) : (
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                      >
                        <TrashIcon aria-hidden />
                        Remove variant{row.label ? ` ${row.label}` : ""}
                      </Button>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>
        {rows.length < MAX_VARIANTS && (
          <Button variant="secondary" className="self-start" onClick={() => setRows((current) => [...current, newRow(measures.length)])}>
            <PlusIcon aria-hidden />
            {several ? "Add variant" : "Add variants (size, flavor)"}
          </Button>
        )}
      </FieldSet>

      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {rowErrors.some((e) => Object.keys(e).length > 0) && (
        <p role="alert" className="type-body-sm text-danger-text">
          Some prices or stock aren't right yet. See the notes in red above.
        </p>
      )}
      {formError && (
        <p role="alert" className="type-body-sm text-danger-text">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="self-start">
        {pending ? "Saving…" : product ? "Save changes" : "Add product"}
      </Button>
    </form>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
  wide = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  inputMode?: "decimal" | "numeric"
  wide?: boolean
}) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={wide ? "max-w-sm" : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

/** Deletes a product nobody has ordered yet. */
export function DeleteProductButton({
  campaignId,
  productId,
  name,
}: {
  campaignId: string
  productId: string
  name: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, startDelete] = useTransition()

  function remove() {
    startDelete(async () => {
      const result = await deleteProductAction(campaignId, productId)
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
      <AlertDialogTrigger render={<Button variant="danger" />}>Delete product</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>The product and its photo leave the catalog and the kasir. This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction loading={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
