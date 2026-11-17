import { ShopError } from "./errors"
import type { BundleLine, CartLine, ProductLine } from "./types"

/*
 * What a buyer or the register asks for, as it arrives from the browser. The
 * shop, the register, both server actions and the store all go through
 * parseCart, so the limits are the same everywhere. Safe to import from
 * client components.
 */

/** No single variant or bundle may be asked for more than this; keeps typos from emptying stock. */
export const MAX_QTY_PER_LINE = 20
export const MAX_CART_LINES = 50
/** The most components one bundle may have. */
export const MAX_BUNDLE_COMPONENTS = 8
/** The longest custom nickname for one unit of a product that takes nicknames. */
export const MAX_NICKNAME_LENGTH = 20

const MAX_ID_LENGTH = 100

/** A cart line without its quantity: which variant, or which bundle with which picks. */
export type CartChoice = Omit<ProductLine, "qty"> | Omit<BundleLine, "qty">

export function isBundleLine<T extends CartChoice>(line: T): line is Extract<T, { bundleId: string }> {
  return "bundleId" in line
}

/** Lines with the same key are the same thing asked for, and merge. */
export function lineKey(line: CartChoice) {
  return isBundleLine(line) ? `b:${line.bundleId}/${line.picks.join(",")}` : `p:${line.productId}/${line.variantId}`
}

/**
 * Turns untrusted input into cart lines, one per variant or bundle with the
 * same picks. Lines with a quantity of 0 are dropped. Throws INVALID_CART,
 * EMPTY_CART or QTY_LIMIT.
 */
export function parseCart(input: unknown): CartLine[] {
  if (!Array.isArray(input) || input.length > MAX_CART_LINES) throw new ShopError("INVALID_CART")

  const merged = new Map<string, CartLine>()
  for (const raw of input) {
    const line = asLine(raw)
    if (!line) throw new ShopError("INVALID_CART")
    if (line.qty === 0) continue
    const key = lineKey(line)
    const existing = merged.get(key)
    const qty = (existing?.qty ?? 0) + line.qty
    if (isBundleLine(line)) {
      merged.set(key, { ...line, qty })
      continue
    }
    const nicknames = joinNicknames(existing && !isBundleLine(existing) ? existing : undefined, line)
    merged.set(key, { ...line, qty, ...(nicknames && { nicknames }) })
  }

  const lines = [...merged.values()]
  if (lines.length === 0) throw new ShopError("EMPTY_CART")
  if (lines.some((line) => line.qty > MAX_QTY_PER_LINE)) {
    throw new ShopError("QTY_LIMIT", `At most ${MAX_QTY_PER_LINE} of each variant in one order.`)
  }
  return lines
}

/** One nickname as stored: spaces trimmed and collapsed, cut to the limit. */
export function cleanNickname(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, MAX_NICKNAME_LENGTH)
}

/** The nicknames of two lines for the same variant, one entry per unit, joined in order. */
function joinNicknames(first: ProductLine | undefined, next: ProductLine) {
  if (!first?.nicknames && !next.nicknames) return undefined
  const perUnit = (line: ProductLine | undefined) =>
    Array.from({ length: line?.qty ?? 0 }, (_, i) => line?.nicknames?.[i] ?? "")
  return [...perUnit(first), ...perUnit(next)]
}

function asLine(raw: unknown): CartLine | null {
  if (typeof raw !== "object" || raw === null) return null
  const { productId, variantId, bundleId, picks, qty, nicknames } = raw as Record<string, unknown>
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0) return null
  if (bundleId !== undefined) {
    if (!isId(bundleId) || !Array.isArray(picks)) return null
    if (picks.length === 0 || picks.length > MAX_BUNDLE_COMPONENTS || !picks.every(isId)) return null
    return { bundleId, picks: picks.slice(), qty }
  }
  if (!isId(productId) || !isId(variantId)) return null
  if (nicknames === undefined) return { productId, variantId, qty }
  if (!Array.isArray(nicknames) || nicknames.length > MAX_QTY_PER_LINE || !nicknames.every((n) => typeof n === "string")) {
    return null
  }
  return { productId, variantId, qty, nicknames: nicknames.slice(0, qty).map(cleanNickname) }
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH
}
