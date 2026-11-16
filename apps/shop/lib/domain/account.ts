import { displayStatus } from "./delivery"
import { isOpenStatus } from "./order"
import type { Order } from "./types"

/*
 * Buyer accounts: what a profile must hold, and how an account's orders are
 * shown. Signing in happens on PPITSZ Account (@ppitsz/accounts).
 */

export interface ProfileFields {
  name: string
  wechatId: string
  phone: string
}

export type ProfileIssues = Partial<Record<keyof ProfileFields, string>>

/** The profile, trimmed, and what is wrong with it. The phone is optional; delivery asks for it at checkout. */
export function cleanProfile(input: ProfileFields): { profile: ProfileFields; issues: ProfileIssues } {
  const profile = { name: input.name.trim(), wechatId: input.wechatId.trim(), phone: input.phone.trim() }
  const issues: ProfileIssues = {}
  if (profile.name.length < 2) issues.name = "Write your name, at least 2 characters."
  else if (profile.name.length > 60) issues.name = "Your name can be at most 60 characters."
  if (!profile.wechatId) issues.wechatId = "Write your WeChat ID so we can reach you."
  else if (profile.wechatId.length > 40) issues.wechatId = "Your WeChat ID can be at most 40 characters."
  if (profile.phone.length > 30) issues.phone = "Your phone number can be at most 30 characters."
  else if (!/^[0-9+()\s-]*$/.test(profile.phone)) issues.phone = "Your phone number can only have digits, spaces and +."
  return { profile, issues }
}

/**
 * Where to go after signing in: a path on this site only, so a crafted
 * `?next=` can't send the buyer elsewhere.
 */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback
  }
  return next
}

/**
 * Active: still moving (waiting for payment, being checked, paid but not all
 * collected or delivered). Done: everything else. Newest first.
 */
export function splitOrders(orders: Order[]): { active: Order[]; done: Order[] } {
  const newest = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return {
    active: newest.filter((o) => isOpenStatus(o.status)),
    done: newest.filter((o) => !isOpenStatus(o.status)),
  }
}

/** What the buyer should know first, most urgent first. */
const SUMMARY_PARTS = [
  ["ready", "ready to pick up"],
  ["sending", "on its way"],
  ["pending_payment", "waiting for payment"],
  ["awaiting_verification", "being checked"],
  ["to_deliver", "waiting for delivery"],
] as const

type SummaryKey = (typeof SUMMARY_PARTS)[number][0]

function summaryKey(order: Order): SummaryKey | null {
  const shown = displayStatus(order)
  if (shown === "sending") return "sending"
  if (shown === "paid") return order.delivery ? "to_deliver" : "ready"
  if (shown === "pending_payment" || shown === "awaiting_verification") return shown
  return null
}

/** "1 order ready to pick up, 1 waiting for payment." for the homepage greeting. */
export function ordersSummary(active: Order[]): string {
  if (active.length === 0) return "No orders in progress."
  const counts = new Map<SummaryKey, number>()
  for (const order of active) {
    const key = summaryKey(order)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const parts = SUMMARY_PARTS.filter(([key]) => counts.has(key)).map(([key, text]) => `${counts.get(key)} ${text}`)
  return `${parts.map((p, i) => (i === 0 ? p.replace(/^(\d+) /, (_, n: string) => `${n} ${n === "1" ? "order" : "orders"} `) : p)).join(", ")}.`
}
