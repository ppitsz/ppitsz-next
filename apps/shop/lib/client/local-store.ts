"use client"

import { useSyncExternalStore } from "react"

import { isBundleLine, lineKey, type CartChoice } from "../domain/cart"
import type { CartLine } from "../domain/types"

/*
 * Per-device state kept in localStorage: the cart, the checkout attempt and
 * the last delivery address. Orders belong to the buyer's account, not to
 * the phone. Storage can be missing or
 * blocked (private mode, WeChat's browser), so every access is guarded and
 * the app still works, just without memory.
 */

const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; value: unknown }>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Parses once per stored string, so snapshots stay referentially stable. */
function read<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let value = fallback
  try {
    if (raw) value = JSON.parse(raw) as T
  } catch {
    // Corrupt entry: start over.
  }
  cache.set(key, { raw, value })
  return value
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: keep working without it.
    cache.set(key, { raw: readRaw(key), value })
  }
  listeners.forEach((listener) => listener())
}

function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback
  )
}

/* -------------------------------------------------------------------------
   Cart
   ------------------------------------------------------------------------- */

const EMPTY_CART: CartLine[] = []
const cartKey = (campaignId: string) => `shop:cart:${campaignId}`

export function useCart(campaignId: string) {
  const key = cartKey(campaignId)
  const lines = useStored(key, EMPTY_CART)

  function setQty(choice: CartChoice, qty: number) {
    const current = read(key, EMPTY_CART)
    const wanted = lineKey(choice)
    const index = current.findIndex((l) => lineKey(l) === wanted)
    if (qty <= 0) return write(key, current.filter((_, i) => i !== index))
    // Nicknames already typed stay, cut to the new quantity.
    const previous = index === -1 ? undefined : current[index]
    const kept = previous && !isBundleLine(previous) ? previous.nicknames?.slice(0, qty) : undefined
    const line = { ...choice, qty, ...(kept && { nicknames: kept }) } as CartLine
    // Keep the line where it was, so the cart doesn't reorder as you tap.
    const next = current.slice()
    if (index === -1) next.push(line)
    else next[index] = line
    write(key, next)
  }

  function qtyOf(choice: CartChoice) {
    const wanted = lineKey(choice)
    return lines.find((l) => lineKey(l) === wanted)?.qty ?? 0
  }

  /** Sets the custom nickname of each unit of a product line, as typed. */
  function setNicknames(choice: CartChoice, nicknames: string[]) {
    const wanted = lineKey(choice)
    const current = read(key, EMPTY_CART)
    write(key, current.map((l) => (lineKey(l) === wanted && !isBundleLine(l) ? { ...l, nicknames } : l)))
  }

  return { lines, setQty, qtyOf, setNicknames }
}

export function clearCart(campaignId: string) {
  write(cartKey(campaignId), EMPTY_CART)
}

/* -------------------------------------------------------------------------
   Checkout attempt — an id saved before submitting, so a page that reloads
   mid-submit can ask the server whether the order was already made.
   ------------------------------------------------------------------------- */

const checkoutKey = (campaignId: string) => `shop:checkout:${campaignId}`

/** The pending checkout id, made on first use. Stable until the order exists. */
export function getCheckoutId(campaignId: string) {
  const existing = read<string | null>(checkoutKey(campaignId), null)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(checkoutKey(campaignId), id)
  return id
}

/** Without notifying: nothing renders from the checkout id. */
export function peekCheckoutId(campaignId: string) {
  return read<string | null>(checkoutKey(campaignId), null)
}

export function clearCheckoutId(campaignId: string) {
  try {
    window.localStorage.removeItem(checkoutKey(campaignId))
  } catch {
    // Blocked storage never held it.
  }
  cache.delete(checkoutKey(campaignId))
}

/* -------------------------------------------------------------------------
   The last delivery address, remembered on this device so the next delivery
   order doesn't mean typing it again. Name, WeChat ID and phone come from
   the buyer's account.
   ------------------------------------------------------------------------- */

const ADDRESS_KEY = "shop:address"

export function useAddressDraft() {
  const address = useStored(ADDRESS_KEY, "")
  return { address, setAddress: (value: string) => write(ADDRESS_KEY, value) }
}
