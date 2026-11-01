export interface NavLink {
  href: string
  label: string
}

/** Whether `href` is the current page or one of its children. */
export function isCurrentHref(href: string, currentHref?: string) {
  if (!currentHref) return false
  if (href === "/") return currentHref === "/"
  return currentHref === href || currentHref.startsWith(`${href}/`)
}
