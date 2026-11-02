"use client"

import { useRouter } from "next/navigation"

import { useVisiblePoll } from "@/lib/client/use-visible-poll"

const MINUTE = 60_000

/** Often right after the buyer pays, when they are likely watching; rarer later. */
function delay(elapsed: number) {
  if (elapsed > 3 * 60 * MINUTE) return null
  if (elapsed < 5 * MINUTE) return 10_000
  if (elapsed < 30 * MINUTE) return 20_000
  return MINUTE
}

/**
 * Refreshes the buyer's order page when Danus approves, rejects or hands
 * over, so the QR appears without a reload. Polls a one-read endpoint and
 * re-renders the page only when the order changed.
 */
export function OrderWatcher({ token, version, active }: { token: string; version: string; active: boolean }) {
  const router = useRouter()
  useVisiblePoll(
    async () => {
      const res = await fetch(`/api/orders/${token}`, { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as { version?: string }
      if (data.version && data.version !== version) router.refresh()
    },
    delay,
    active
  )
  return null
}
