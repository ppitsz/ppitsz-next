export interface NavLink {
  href: string
  label: string
}

/** Another PPITSZ app, for the header's Transfer menu and the footer. */
export interface TransferLink {
  href: string
  label: string
  /** One short line: what is there. */
  description?: string
}

/** Whether `href` is the current page or one of its children. */
export function isCurrentHref(href: string, currentHref?: string) {
  if (!currentHref) return false
  if (href === "/") return currentHref === "/"
  return currentHref === href || currentHref.startsWith(`${href}/`)
}
