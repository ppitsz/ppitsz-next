/*
 * Where each app lives (ADR 0010). Every app is `<subdomain>.<root domain>`:
 * the root is ROOT_DOMAIN when set (a preview, say "preview.ppitshenzhen.org"),
 * else "ppitshenzhen.org" on Vercel. Locally there is no root, and each app
 * runs on its own port (`bun run dev`).
 *
 * A new app is one entry in APPS: its links, the Transfer menu and the
 * sign-in's allowed redirects all follow.
 */

const PRODUCTION_ROOT_DOMAIN = "ppitshenzhen.org"

export const APPS = {
  shop: {
    subdomain: "shop",
    port: 3001,
    live: true,
    label: "PPITSZ Shop",
    description: "Food and merchandise from our campaigns",
  },
  forms: {
    subdomain: "forms",
    port: 3002,
    /** Not deployed yet. Flip once forms.ppitshenzhen.org serves it. */
    live: false,
    label: "PPITSZ Forms",
    description: "Event sign-ups and tickets",
  },
  account: {
    subdomain: "account",
    port: 3003,
    live: true,
    label: "PPITSZ Account",
    description: "Your details and staff apps",
  },
} as const satisfies Record<string, AppEntry>

interface AppEntry {
  subdomain: string
  /** Its `next dev` port. */
  port: number
  /** Linked to in production. Locally every app is. */
  live: boolean
  label: string
  description: string
}

export type AppId = keyof typeof APPS

const APP_IDS = Object.keys(APPS) as AppId[]

/** "ppitshenzhen.org", a preview's root, or null locally. */
export function rootDomain(): string | null {
  const root = process.env.ROOT_DOMAIN?.trim().replace(/^\.+|\.+$/g, "")
  if (root) return root
  return process.env.VERCEL ? PRODUCTION_ROOT_DOMAIN : null
}

/** An app's origin, without a trailing slash. */
export function appOrigin(id: AppId) {
  const root = rootDomain()
  return root ? `https://${APPS[id].subdomain}.${root}` : `http://localhost:${APPS[id].port}`
}

/** Whether to link to an app: always locally, in production once it's live. */
export function appLive(id: AppId) {
  return APPS[id].live || process.env.NODE_ENV !== "production"
}

/**
 * The session cookie's domain, so one sign-in reaches every app (ADR 0008).
 * Locally none: the cookie stays on localhost, whose ports share cookies.
 */
export function sessionCookieDomain(): string | undefined {
  const root = rootDomain()
  return root ? `.${root}` : undefined
}

export const accountOrigin = () => appOrigin("account")
export const shopOrigin = () => appOrigin("shop")
export const formsOrigin = () => appOrigin("forms")

/** The old website's dev port: apps/docs already has Next's default, 3000. */
const SITE_PORT = 3004

/**
 * The old main website (www.ppitshenzhen.org, its own repo). It signs in
 * through PPITSZ Account (ADR 0015), so sign-in may send people back to it.
 * It isn't one of our apps: it has no entry in APPS and no Transfer link.
 */
export function siteOrigin() {
  const root = rootDomain()
  return root ? `https://www.${root}` : `http://localhost:${SITE_PORT}`
}

/** Another app, as the header's Transfer menu and the footer list it. */
export interface TransferApp {
  href: string
  label: string
  description: string
}

/** The other live PPITSZ apps, from `from`: where a buyer or responder can transfer to. */
export function transferApps(from: AppId): TransferApp[] {
  return APP_IDS.filter((id) => id !== from && appLive(id)).map((id) => ({
    href: appOrigin(id),
    label: APPS[id].label,
    description: APPS[id].description,
  }))
}

/** The account app's sign-in, coming back to `next` (a full URL) afterwards. */
export function signInUrl(next: string) {
  return `${accountOrigin()}/sign-in?next=${encodeURIComponent(next)}`
}

/** The account app first, then every other live app and the old website: safeNext's default. */
function ownOrigins() {
  return [accountOrigin(), ...APP_IDS.filter((id) => id !== "account" && appLive(id)).map(appOrigin), siteOrigin()]
}

/**
 * Where to go after signing in: a path on the account app, or a full URL on
 * one of our own apps or the old website, so a crafted `?next=` can't send anyone elsewhere.
 * The apps are listed one by one, never as "any subdomain": a forgotten DNS
 * record pointing at someone else's host must not become a redirect target.
 *
 * `next` is resolved the way the browser will resolve it, then its origin is
 * checked. A prefix check alone misses "/\t/evil.example": browsers drop tabs
 * and newlines from URLs, which leaves "//evil.example".
 */
export function safeNext(next: unknown, fallback = "/", origins: string[] = ownOrigins()): string {
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
