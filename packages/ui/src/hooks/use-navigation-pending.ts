"use client"

import * as React from "react"

/**
 * Whether a page of this site is on its way: true from a click on a link to
 * another path until `currentHref` (the pathname) changes, so the header can
 * run a train along its line stripe. Framework-free: it watches clicks, not
 * the router. Ignores new tabs, modified clicks, downloads, other origins and
 * links to the same path (a hash or a query change). Gives up after 10s, and
 * on back/forward.
 */
export function useNavigationPending(currentHref?: string) {
  const [pending, setPending] = React.useState(false)
  const [lastHref, setLastHref] = React.useState(currentHref)
  if (currentHref !== lastHref) {
    setLastHref(currentHref)
    setPending(false)
  }

  React.useEffect(() => {
    // No defaultPrevented check: client-side links prevent the default
    // themselves before the event reaches the document.
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      setPending(true)
    }
    const stop = () => setPending(false)
    document.addEventListener("click", onClick)
    window.addEventListener("popstate", stop)
    return () => {
      document.removeEventListener("click", onClick)
      window.removeEventListener("popstate", stop)
    }
  }, [])

  React.useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(false), 10_000)
    return () => window.clearTimeout(timer)
  }, [pending])

  return pending
}
