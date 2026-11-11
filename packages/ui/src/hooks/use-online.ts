"use client"

import { useSyncExternalStore } from "react"

/** Whether the browser has a network. On the server, assumed online. */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}

function subscribe(listener: () => void) {
  window.addEventListener("online", listener)
  window.addEventListener("offline", listener)
  return () => {
    window.removeEventListener("online", listener)
    window.removeEventListener("offline", listener)
  }
}
