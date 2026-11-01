"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { DOCS_GROUPS } from "@/lib/nav"

export function DocsHeader({ brand }: { brand: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <SiteHeader
      brand={brand}
      links={DOCS_GROUPS.map((group) => ({ href: group.href, label: group.title }))}
      currentHref={pathname}
      account={<ThemeControl />}
      menuExtras={<ThemeControl />}
      linkAs={Link}
      navLabel="Main"
      closeLabel="Close"
    />
  )
}
