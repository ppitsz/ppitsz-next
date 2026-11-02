"use client"

import { useEffect } from "react"

import { clearCart, clearCheckoutId } from "@/lib/client/local-store"

/** Right after checkout: empties the cart the order came from and retires its checkout id. */
export function AfterCheckout({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    clearCart(campaignId)
    clearCheckoutId(campaignId)
    // Drop ?new=1, so reopening or sharing this link later can't empty a new cart.
    window.history.replaceState(window.history.state, "", window.location.pathname)
  }, [campaignId])

  return null
}
