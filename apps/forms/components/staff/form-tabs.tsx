"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/** The pages of one form in the dashboard, as a row of capsules that scrolls on a phone. */
export function FormTabs({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname()
  // The longest matching link, so /responses/<id> keeps "Responses" current.
  const current = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav aria-label="Form pages" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className="inline-flex h-11 items-center rounded-full border border-border-strong px-4 type-ui whitespace-nowrap text-text hover:bg-surface-strong aria-[current=page]:border-text aria-[current=page]:bg-surface-strong"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
