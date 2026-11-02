import { MAX_BUNDLE_COMPONENTS } from "./cart"
import { ShopError } from "./errors"
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_PRICE_FEN, MAX_SORT_ORDER } from "./product"
import type { Bundle, BundleComponent, BundleUnit } from "./types"

/*
 * Bundles: what Danus admins edit, and how many a buyer can still get.
 *
 * checkBundleEdit holds every rule. The bundle form runs it to show errors
 * next to the fields; applyBundleEdit runs it again in the store's
 * transaction, against the campaign's products as they are then. Safe to
 * import from client components.
 */

/** The most units of one component in one bundle. */
export const MAX_COMPONENT_QTY = 10

export interface BundleEdit {
  name: string
  description: string
  priceFen: number
  active: boolean
  sortOrder: number
  components: BundleComponent[]
}

export interface BundleIssue {
  field: "name" | "description" | "priceFen" | "sortOrder" | "components"
  /** Which of `edit.components`, for a component's problem. */
  index?: number
  /** A sentence to show next to the field. */
  message: string
}

/**
 * Every problem with `edit`. `productIds` are the products of the bundle's
 * campaign; a component must be one of them. An empty list means
 * applyBundleEdit will accept it.
 */
export function checkBundleEdit(edit: BundleEdit, productIds: ReadonlySet<string>): BundleIssue[] {
  const issues: BundleIssue[] = []
  const invalid = (field: BundleIssue["field"], message: string, index?: number) =>
    issues.push({ field, index, message })

  const name = edit.name.trim()
  if (name.length < 2) invalid("name", "Write the bundle name.")
  else if (name.length > MAX_NAME_LENGTH) invalid("name", `The bundle name can be at most ${MAX_NAME_LENGTH} characters.`)
  if (edit.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    invalid("description", `The description can be at most ${MAX_DESCRIPTION_LENGTH} characters.`)
  }
  if (!Number.isInteger(edit.priceFen) || edit.priceFen < 1 || edit.priceFen > MAX_PRICE_FEN) {
    invalid("priceFen", "The price must be more than ¥0 and at most ¥100,000.")
  }
  if (!Number.isInteger(edit.sortOrder) || edit.sortOrder < 0 || edit.sortOrder > MAX_SORT_ORDER) {
    invalid("sortOrder", `The order must be a whole number from 0 to ${MAX_SORT_ORDER}.`)
  }

  if (edit.components.length === 0 || edit.components.length > MAX_BUNDLE_COMPONENTS) {
    invalid("components", `A bundle holds 1 to ${MAX_BUNDLE_COMPONENTS} products.`)
  }
  edit.components.forEach((c, i) => {
    if (!productIds.has(c.productId)) invalid("components", "Choose the product.", i)
    if (!Number.isInteger(c.qty) || c.qty < 1 || c.qty > MAX_COMPONENT_QTY) {
      invalid("components", `The quantity is 1 to ${MAX_COMPONENT_QTY}.`, i)
    }
  })
  const units = edit.components.reduce((sum, c) => sum + (Number.isInteger(c.qty) ? c.qty : 0), 0)
  if (edit.components.length > 0 && units < 2) {
    invalid("components", "A bundle holds at least 2 items. Add a product or raise a quantity.")
  }
  return issues
}

/** Applies `edit`. Throws INVALID_BUNDLE with the first problem checkBundleEdit finds. */
export function applyBundleEdit(
  edit: BundleEdit,
  base: { id: string; campaignId: string; imagePath?: string },
  productIds: ReadonlySet<string>
): Bundle {
  const issue = checkBundleEdit(edit, productIds)[0]
  if (issue) {
    const where = issue.index === undefined ? "" : `Product ${issue.index + 1}: `
    throw new ShopError("INVALID_BUNDLE", `${where}${issue.message}`)
  }
  return {
    id: base.id,
    campaignId: base.campaignId,
    name: edit.name.trim(),
    description: edit.description.trim(),
    imagePath: base.imagePath,
    priceFen: edit.priceFen,
    active: edit.active,
    sortOrder: edit.sortOrder,
    components: edit.components.map(({ productId, qty }) => ({ productId, qty })),
  }
}

/**
 * How many bundles the picked variants can still make. `units` are one
 * bundle's units, each with what its variant has left; units of the same
 * variant (same `key`) add up, so two shirts of size M need two Ms.
 */
export function bundlesLeft(units: { key: string; qty: number; available: number }[]) {
  const needs = new Map<string, { qty: number; available: number }>()
  for (const unit of units) {
    const need = needs.get(unit.key)
    needs.set(unit.key, { qty: (need?.qty ?? 0) + unit.qty, available: unit.available })
  }
  let left = Infinity
  for (const { qty, available } of needs.values()) left = Math.min(left, Math.floor(available / qty))
  return Number.isFinite(left) ? Math.max(0, left) : 0
}

/** What a bundle holds, as one line: "2× Kaos SZ Cup 2027 M + Gantungan Kunci". */
export function contentsLabel(units: Pick<BundleUnit, "name" | "variantLabel" | "qty">[]) {
  return units
    .map((u) => `${u.qty > 1 ? `${u.qty}× ` : ""}${u.name}${u.variantLabel ? ` ${u.variantLabel}` : ""}`)
    .join(" + ")
}
