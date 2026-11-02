/*
 * Where each app lives. In production every app sets the ones it links to;
 * locally they default to the dev ports (`bun run dev`).
 */

const trim = (url: string) => url.replace(/\/$/, "")

export function accountOrigin() {
  return trim(process.env.ACCOUNT_URL ?? "http://localhost:3003")
}

export function shopOrigin() {
  return trim(process.env.SHOP_URL ?? "http://localhost:3001")
}

export function formsOrigin() {
  return trim(process.env.FORMS_URL ?? "http://localhost:3002")
}

/** In production, Forms is only linked to once FORMS_URL says where it lives. */
export function formsLive() {
  return !!process.env.FORMS_URL || process.env.NODE_ENV !== "production"
}

/** The account app's sign-in, coming back to `next` (a full URL) afterwards. */
export function signInUrl(next: string) {
  return `${accountOrigin()}/sign-in?next=${encodeURIComponent(next)}`
}

/**
 * Where to go after signing in: a path on the account app, or a full URL on
 * one of our own apps, so a crafted `?next=` can't send anyone elsewhere.
 *
 * `next` is resolved the way the browser will resolve it, then its origin is
 * checked. A prefix check alone misses "/\t/evil.example": browsers drop tabs
 * and newlines from URLs, which leaves "//evil.example".
 */
export function safeNext(
  next: unknown,
  fallback = "/",
  origins: string[] = [accountOrigin(), shopOrigin(), formsOrigin()]
): string {
  if (typeof next !== "string" || next === "" || next.includes("\\")) return fallback
  const self = origins[0]!
  let url: URL
  try {
    url = new URL(next, self)
  } catch {
    return fallback
  }
  if (!origins.includes(url.origin)) return fallback
  return url.origin === self ? `${url.pathname}${url.search}${url.hash}` : url.href
}
