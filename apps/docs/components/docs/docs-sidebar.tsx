"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@ppitsz/ui/lib/utils"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { DOCS_GROUPS } from "@/lib/nav"

/**
 * The docs navigation, drawn the way the site header draws its mobile menu: each
 * group is a short brand-red line and the current page is "here".
 */
export function DocsSidebar() {
  const pathname = usePathname()
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-8 py-10">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className="type-ui text-text underline-offset-4 hover:underline aria-[current=page]:underline aria-[current=page]:decoration-2"
      >
        Overview
      </Link>
      {DOCS_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-4">
          <Link
            href={group.href}
            aria-current={pathname === group.href ? "page" : undefined}
            className="type-kicker text-muted underline-offset-4 hover:underline aria-[current=page]:text-text"
          >
            {group.title}
          </Link>
          <RouteList orientation="vertical" className="[--route-gap:--spacing(3)]">
            {group.pages.map((page) => {
              const current = pathname === page.href
              return (
                <RouteStop
                  key={page.href}
                  state={current ? "here" : "upcoming"}
                  current={current ? "page" : undefined}
                >
                  <Link
                    href={page.href}
                    className={cn(
                      "type-sign underline-offset-4 hover:underline",
                      current ? "text-text" : "text-muted"
                    )}
                  >
                    {page.title}
                  </Link>
                </RouteStop>
              )
            })}
          </RouteList>
        </div>
      ))}
    </nav>
  )
}
