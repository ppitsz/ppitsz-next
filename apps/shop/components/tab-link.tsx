"use client"

import NextLink from "next/link"

import { toggleVariants } from "@ppitsz/ui/components/toggle"

/** A filter chip as a link: filled while its tab is shown. */
export function TabLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <NextLink
      href={href}
      aria-current={current ? "page" : undefined}
      data-pressed={current || undefined}
      className={toggleVariants({ size: "md" })}
    >
      {children}
    </NextLink>
  )
}
