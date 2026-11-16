import { ShopError } from "./errors"
import type { Category, PaymentAccount, Product, SizeChart, Variant } from "./types"

/*
 * What shop admins edit. The stock counters (onlineOrdered, walkIn) are never
 * part of an edit: orders change them, so a save keeps whatever the stored
 * product has at that moment.
 *
 * checkProductEdit holds every rule. The product form runs it to show
 * errors next to the fields; applyProductEdit runs it again in the store's
 * transaction, against the counters as they are then.
 */

export const MAX_VARIANTS = 12
export const MAX_PRICE_FEN = 100_000_00
export const MAX_STOCK = 10_000
export const MAX_NAME_LENGTH = 80
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_LABEL_LENGTH = 40
export const MAX_SORT_ORDER = 999
export const MAX_MEASURES = 6
export const MAX_MEASURE_LENGTH = 24
export const MAX_MEASUREMENT_LENGTH = 12
export const MAX_SIZE_NOTE_LENGTH = 300
export const MAX_TAGS = 3
export const MAX_TAG_LENGTH = 20
export const MAX_ALLERGENS = 8
export const MAX_ALLERGEN_LENGTH = 40

export interface VariantEdit {
  /** Missing for a new variant. */
  id?: string
  label: string
  priceFen: number
  stock: number
  onlineCap: number | null
  /** One value per measure of the edit's size chart. */
  measurements?: string[]
}

export interface ProductEdit {
  name: string
  description: string
  category: Category
  active: boolean
  /** Null or missing: no limit on that side. */
  onSaleFrom?: Date | null
  onSaleUntil?: Date | null
  sortOrder: number
  variants: VariantEdit[]
  /** Null or no measures: no measurement table. */
  sizeChart?: SizeChart | null
  /** Missing: none. Trimmed and deduplicated on save. */
  tags?: string[]
  allergens?: string[]
}

export type VariantField = "label" | "priceFen" | "stock" | "onlineCap" | "measurements"

export interface ProductIssue {
  code: "INVALID_PRODUCT" | "STOCK_BELOW_SOLD" | "VARIANT_IN_USE"
  /** The product field, or a variant's field together with `index`. */
  field: "name" | "description" | "sortOrder" | "onSale" | "tags" | "allergens" | "variants" | "sizeChart" | VariantField
  /** Which of `edit.variants`, for a variant's field. */
  index?: number
  /** A sentence to show next to the field. */
  message: string
}

/**
 * Every problem with `edit`, checked against the variants stored now (none
 * for a new product). An empty list means applyProductEdit will accept it.
 */
export function checkProductEdit(stored: Variant[], edit: ProductEdit): ProductIssue[] {
  const issues: ProductIssue[] = []
  const invalid = (field: ProductIssue["field"], message: string, index?: number) =>
    issues.push({ code: "INVALID_PRODUCT", field, index, message })

  const name = edit.name.trim()
  if (name.length < 2) invalid("name", "Write the product name.")
  else if (name.length > MAX_NAME_LENGTH) invalid("name", `The product name can be at most ${MAX_NAME_LENGTH} characters.`)
  if (edit.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    invalid("description", `The description can be at most ${MAX_DESCRIPTION_LENGTH} characters.`)
  }
  if (!Number.isInteger(edit.sortOrder) || edit.sortOrder < 0 || edit.sortOrder > MAX_SORT_ORDER) {
    invalid("sortOrder", `The order must be a whole number from 0 to ${MAX_SORT_ORDER}.`)
  }
  if (edit.onSaleFrom && edit.onSaleUntil && edit.onSaleUntil <= edit.onSaleFrom) {
    invalid("onSale", "The sale end date must be after the start date.")
  }
  const tags = cleanList(edit.tags)
  if (tags.length > MAX_TAGS) invalid("tags", `At most ${MAX_TAGS} labels.`)
  else if (tags.some((t) => t.length > MAX_TAG_LENGTH)) invalid("tags", `Each label can be at most ${MAX_TAG_LENGTH} characters.`)
  const allergens = cleanList(edit.allergens)
  if (allergens.length > MAX_ALLERGENS) invalid("allergens", `At most ${MAX_ALLERGENS} allergens.`)
  else if (allergens.some((a) => a.length > MAX_ALLERGEN_LENGTH)) {
    invalid("allergens", `Each allergen can be at most ${MAX_ALLERGEN_LENGTH} characters.`)
  }
  if (edit.variants.length === 0 || edit.variants.length > MAX_VARIANTS) {
    invalid("variants", `Add 1 to ${MAX_VARIANTS} variants.`)
  }

  const byId = new Map(stored.map((v) => [v.id, v]))
  const several = edit.variants.length > 1
  const labels = new Set<string>()
  edit.variants.forEach((v, i) => {
    const label = v.label.trim()
    if (several && !label) invalid("label", "This variant needs a name, like a size or flavor.", i)
    else if (label.length > MAX_LABEL_LENGTH) invalid("label", `The variant name can be at most ${MAX_LABEL_LENGTH} characters.`, i)
    else if (labels.has(label.toLowerCase())) invalid("label", `The name "${label}" is used twice.`, i)
    labels.add(label.toLowerCase())

    if (!Number.isInteger(v.priceFen) || v.priceFen < 1 || v.priceFen > MAX_PRICE_FEN) {
      invalid("priceFen", "The price must be more than ¥0 and at most ¥100,000.", i)
    }
    const sold = soldOf(v.id ? byId.get(v.id) : undefined)
    if (!isCount(v.stock)) invalid("stock", `Stock must be a whole number from 0 to ${MAX_STOCK}.`, i)
    else if (v.stock < sold) {
      issues.push({
        code: "STOCK_BELOW_SOLD",
        field: "stock",
        index: i,
        message: `At least ${sold}, because ${sold} are already ordered and sold.`,
      })
    }
    if (v.onlineCap !== null && !isCount(v.onlineCap)) {
      invalid("onlineCap", `The online cap must be a whole number from 0 to ${MAX_STOCK}, or empty.`, i)
    }
  })
  checkSizeChart(edit, invalid)

  const kept = new Set(edit.variants.map((v) => v.id))
  for (const old of stored) {
    if (!kept.has(old.id) && !canRemoveVariant(old)) {
      issues.push({
        code: "VARIANT_IN_USE",
        field: "variants",
        message: `${capitalize(describe(old.label))} has already been ordered or sold.`,
      })
    }
  }
  return issues
}

function checkSizeChart(
  edit: ProductEdit,
  invalid: (field: ProductIssue["field"], message: string, index?: number) => void
) {
  const chart = edit.sizeChart
  // No columns: no table, whatever the rows still hold (applyProductEdit drops them).
  if (!chart?.measures.length) return
  if (chart.measures.length > MAX_MEASURES) invalid("sizeChart", `A size chart can have at most ${MAX_MEASURES} columns.`)
  const names = new Set<string>()
  for (const measure of chart.measures) {
    const name = measure.trim()
    if (!name) invalid("sizeChart", "Every size chart column needs a name, like Chest width.")
    else if (name.length > MAX_MEASURE_LENGTH) {
      invalid("sizeChart", `A size chart column name can be at most ${MAX_MEASURE_LENGTH} characters.`)
    } else if (names.has(name.toLowerCase())) invalid("sizeChart", `The column "${name}" is used twice.`)
    names.add(name.toLowerCase())
  }
  if (chart.note.trim().length > MAX_SIZE_NOTE_LENGTH) {
    invalid("sizeChart", `The fit note can be at most ${MAX_SIZE_NOTE_LENGTH} characters.`)
  }
  edit.variants.forEach((v, i) => {
    const values = v.measurements ?? []
    if (values.length !== chart.measures.length) {
      invalid("measurements", "The size chart couldn't be read. Reload the page.", i)
    } else if (values.some((value) => value.trim().length > MAX_MEASUREMENT_LENGTH)) {
      invalid("measurements", `Each measurement can be at most ${MAX_MEASUREMENT_LENGTH} characters, like 52 or 50–52.`, i)
    }
  })
}

/** A variant nobody has ordered or bought can be removed from its product. */
export function canRemoveVariant(variant: Pick<Variant, "onlineOrdered" | "walkIn">) {
  return soldOf(variant) === 0
}

/**
 * Applies `edit` to the stored product (null for a new one). Throws the
 * first problem checkProductEdit finds, with the variant named.
 */
export function applyProductEdit(
  current: Product | null,
  edit: ProductEdit,
  base: { id: string; campaignId: string; imagePath?: string; sizeChartPath?: string },
  newId: () => string = randomId
): Product {
  const issue = checkProductEdit(current?.variants ?? [], edit)[0]
  if (issue) {
    const variant = issue.index === undefined ? undefined : edit.variants[issue.index]
    const where = variant ? `${capitalize(describe(variant.label.trim()))}: ` : ""
    throw new ShopError(issue.code, `${where}${issue.message}`)
  }

  const chart = edit.sizeChart?.measures.length
    ? { measures: edit.sizeChart.measures.map((m) => m.trim()), note: edit.sizeChart.note.trim() }
    : undefined
  const stored = new Map((current?.variants ?? []).map((v) => [v.id, v]))
  const usedIds = new Set(edit.variants.flatMap((v) => (v.id && stored.has(v.id) ? [v.id] : [])))
  const variants: Variant[] = edit.variants.map((v) => {
    const old = v.id ? stored.get(v.id) : undefined
    let id = old?.id
    if (!id) {
      do id = newId()
      while (usedIds.has(id))
      usedIds.add(id)
    }
    return {
      id,
      label: v.label.trim(),
      priceFen: v.priceFen,
      stock: v.stock,
      onlineCap: v.onlineCap,
      onlineOrdered: old?.onlineOrdered ?? 0,
      walkIn: old?.walkIn ?? 0,
      measurements: chart && v.measurements?.map((value) => value.trim()),
    }
  })

  return {
    id: base.id,
    campaignId: base.campaignId,
    name: edit.name.trim(),
    description: edit.description.trim(),
    category: edit.category,
    imagePath: base.imagePath,
    sizeChart: chart,
    sizeChartPath: base.sizeChartPath,
    tags: cleanList(edit.tags),
    allergens: cleanList(edit.allergens),
    active: edit.active,
    onSaleFrom: edit.onSaleFrom ?? undefined,
    onSaleUntil: edit.onSaleUntil ?? undefined,
    sortOrder: edit.sortOrder,
    variants,
  }
}

/** Labels or allergens as stored: trimmed, without empty entries or repeats (case aside). */
export function cleanList(list: string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list ?? []) {
    const item = raw.trim()
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase())
      out.push(item)
    }
  }
  return out
}

/** "New, Spicy" as typed in the product form → its entries. */
export function splitList(text: string): string[] {
  return cleanList(text.split(","))
}

/** Where a product stands against its sale dates: not yet, now, or over. */
export function saleWindow(product: Pick<Product, "onSaleFrom" | "onSaleUntil">, now: Date) {
  if (product.onSaleFrom && now < product.onSaleFrom) return "upcoming" as const
  if (product.onSaleUntil && now >= product.onSaleUntil) return "ended" as const
  return "on" as const
}

/** Sold on its own now: ticked For sale and inside its sale dates. */
export function isOnSale(product: Pick<Product, "active" | "onSaleFrom" | "onSaleUntil">, now: Date) {
  return product.active && saleWindow(product, now) === "on"
}

/** True when nothing was ever reserved or sold, so the product can be deleted. */
export function isUnsold(product: Product) {
  return product.variants.every(canRemoveVariant)
}

function soldOf(variant: Pick<Variant, "onlineOrdered" | "walkIn"> | undefined) {
  return variant ? variant.onlineOrdered + variant.walkIn : 0
}

/** Keeps the QR image of accounts that stay, unless the edit replaces or removes it. */
export function mergePaymentAccounts(
  current: PaymentAccount[],
  edited: (Omit<PaymentAccount, "qrImagePath"> & { removeQr?: boolean; newQrPath?: string })[]
): PaymentAccount[] {
  const old = new Map(current.map((a) => [a.id, a]))
  return edited.map(({ removeQr, newQrPath, ...a }) => ({
    ...a,
    qrImagePath: newQrPath ?? (removeQr ? undefined : old.get(a.id)?.qrImagePath),
  }))
}

function isCount(n: number) {
  return Number.isInteger(n) && n >= 0 && n <= MAX_STOCK
}

function describe(label: string) {
  return label ? `variant "${label}"` : "this product"
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function randomId() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(6))).toString("hex")
}
