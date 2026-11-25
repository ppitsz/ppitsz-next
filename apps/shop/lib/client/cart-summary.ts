import type { Catalog, CatalogVariant } from "../catalog"
import { bundlesLeft, contentsLabel } from "../domain/bundle"
import { isBundleLine, lineKey, MAX_QTY_PER_LINE } from "../domain/cart"
import type { CartLine } from "../domain/types"

export interface SummaryLine {
  key: string
  /** The stored cart line, as it is sent to the server. */
  line: CartLine
  name: string
  /** The variant, or what a bundle holds. */
  detail: string
  qty: number
  unitFen: number
  /** How many this line could take on its own, from the stock the summary counts. */
  available: number
  /** True when the cart asks for more than is left, counting what the other lines take of the same variants. */
  short: boolean
  /** The variant units one of this line takes. */
  units: SummaryUnit[]
  /** True when checkout asks for a custom nickname for every unit of this line. */
  allowNickname: boolean
  /** The products in this line that can only be picked up at some pickup points. */
  pickupLimits: PickupLimit[]
}

/** A product that can only be picked up at the points in `pointIds`. */
export interface PickupLimit {
  name: string
  pointIds: string[]
}

export interface SummaryUnit {
  /** variantKey of the variant. */
  key: string
  qty: number
  name: string
  variant: CatalogVariant
}

export const variantKey = (productId: string, variantId: string) => `${productId}/${variantId}`

/**
 * Joins the stored cart with the current catalog. Lines for products or
 * bundles that disappeared, or aren't on sale yet, are dropped; the server
 * re-prices everything anyway.
 * `stock` is what a variant has left: `available` for an online order, `remaining`
 * at the register. `demand` says how many units of each variant (by variantKey)
 * the whole cart takes.
 */
export function cartSummary(
  lines: CartLine[],
  catalog: Pick<Catalog, "products" | "bundles">,
  stock: "available" | "remaining" = "available"
) {
  const products = new Map(catalog.products.map((p) => [p.id, p]))
  const bundles = new Map(catalog.bundles.map((b) => [b.id, b]))

  const resolved: SummaryLine[] = []
  for (const line of lines) {
    if (isBundleLine(line)) {
      const bundle = bundles.get(line.bundleId)
      if (!bundle || line.picks.length !== bundle.components.length) continue
      const units = bundle.components.flatMap((c, i): SummaryUnit[] => {
        const variant = c.variants.find((v) => v.id === line.picks[i])
        return variant ? [{ key: variantKey(c.productId, variant.id), qty: c.qty, name: c.name, variant }] : []
      })
      if (units.length !== bundle.components.length) continue
      resolved.push({
        key: lineKey(line),
        line,
        name: bundle.name,
        detail: contentsLabel(units.map((u) => ({ name: u.name, variantLabel: u.variant.label, qty: u.qty }))),
        qty: line.qty,
        unitFen: bundle.priceFen,
        available: bundlesLeft(units.map((u) => ({ key: u.key, qty: u.qty, available: u.variant[stock] }))),
        short: false,
        units,
        allowNickname: false,
        pickupLimits: bundle.components.flatMap((c) =>
          c.pickupPointIds?.length ? [{ name: c.name, pointIds: c.pickupPointIds }] : []
        ),
      })
      continue
    }

    const product = products.get(line.productId)
    const variant = product?.variants.find((v) => v.id === line.variantId)
    // A product whose sale moved to a later start is shown, not sold.
    if (!product || !variant || product.onSaleFrom) continue
    resolved.push({
      key: lineKey(line),
      line,
      name: product.name,
      detail: variant.label,
      qty: line.qty,
      unitFen: variant.priceFen,
      available: variant[stock],
      short: false,
      units: [{ key: variantKey(product.id, variant.id), qty: 1, name: product.name, variant }],
      allowNickname: product.allowNickname === true,
      pickupLimits: product.pickupPointIds?.length ? [{ name: product.name, pointIds: product.pickupPointIds }] : [],
    })
  }

  // A shirt in a bundle and the same shirt on its own both come out of one stock.
  const demand = new Map<string, number>()
  for (const l of resolved) {
    for (const u of l.units) demand.set(u.key, (demand.get(u.key) ?? 0) + u.qty * l.qty)
  }
  const summary = resolved.map((l) => ({
    ...l,
    short: l.qty > l.available || l.units.some((u) => demand.get(u.key)! > u.variant[stock]),
  }))

  return {
    lines: summary,
    demand,
    count: summary.reduce((n, l) => n + l.qty, 0),
    totalFen: summary.reduce((n, l) => n + l.qty * l.unitFen, 0),
  }
}

/** True when one more of `line` still fits in what is left, counting what the whole cart takes. */
export function fitsOneMore(
  line: SummaryLine,
  demand: Map<string, number>,
  stock: "available" | "remaining" = "available"
) {
  return (
    line.qty < MAX_QTY_PER_LINE &&
    line.units.every((u) => (demand.get(u.key) ?? 0) + u.qty <= u.variant[stock])
  )
}
