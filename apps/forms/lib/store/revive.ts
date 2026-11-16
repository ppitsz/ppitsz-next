import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore"

/*
 * Firestore documents ↔ domain objects. Dates go in as Dates (the Admin SDK
 * stores them as Timestamps) and come back as Dates; documents never hold
 * their own id.
 */

/** Drops undefined fields, which Firestore rejects, from plain objects at any depth. */
export function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact) as T
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return value
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, compact(v)])
  ) as T
}

/** Timestamps back to Dates, at any depth. */
function revive(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate()
  if (Array.isArray(value)) return value.map(revive)
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]))
  }
  return value
}

/** A document as `T`, with `defaults` filling fields older documents lack. */
export function fromDoc<T extends { id: string }>(snap: DocumentSnapshot, defaults: Partial<T> = {}): T {
  return { ...defaults, ...(revive(snap.data()) as object), id: snap.id } as T
}

/** A domain object as a document: no id, no undefined. */
export function toDoc<T extends { id: string }>(value: T) {
  const { id: _id, ...rest } = value
  return compact(rest)
}
