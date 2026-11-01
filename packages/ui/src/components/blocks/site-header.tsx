"use client"

import * as React from "react"
import { ListIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import { isCurrentHref, type NavLink } from "@ppitsz/ui/lib/nav"
import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"

/*
 * Header. Sticky, solid bg, hairline bottom border; never transparent
 * over the hero, never hidden on scroll. The current page gets a small
 * brand-red station dot — the header's one use of red. On phones a "Menu"
 * button opens a full-screen dialog where the links are stations on a red
 * route. No hover-only dropdowns.
 */

function SiteHeader({
  brand,
  cabinet,
  links,
  currentHref,
  languageSwitcher,
  account,
  menuExtras,
  linkAs,
  navLabel = "Main",
  menuLabel = "Menu",
  closeLabel = "Close",
  className,
}: {
  /** The PPI mark + wordmark, linked home. */
  brand: React.ReactNode
  /** The yearly cabinet mark, shown after a thin divider on desktop. */
  cabinet?: React.ReactNode
  links: NavLink[]
  currentHref?: string
  languageSwitcher?: React.ReactNode
  /** "Sign in" or the account menu. Reserve its size so the header never shifts. */
  account?: React.ReactNode
  /** Extra controls at the bottom of the mobile menu (e.g. ThemeControl). */
  menuExtras?: React.ReactNode
  linkAs?: React.ElementType
  navLabel?: string
  menuLabel?: string
  closeLabel?: string
  className?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const [open, setOpen] = React.useState(false)

  return (
    <header
      data-slot="site-header"
      className={cn("sticky top-0 z-40 border-b bg-bg", className)}
    >
      <Container className="flex h-16 items-center gap-6">
        <div className="flex min-w-0 items-center gap-4">
          {brand}
          {cabinet && (
            <span className="hidden items-center border-s ps-4 lg:flex">{cabinet}</span>
          )}
        </div>

        <nav aria-label={navLabel} className="ms-auto hidden lg:block">
          <ul className="flex items-center gap-6">
            {links.map((link) => {
              const current = isCurrentHref(link.href, currentHref)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className="relative inline-flex min-h-11 items-center type-ui text-text underline-offset-4 hover:underline"
                  >
                    {link.label}
                    {current && (
                      <span
                        aria-hidden
                        className="absolute bottom-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-accent-line"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {languageSwitcher}
          {account}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button variant="quiet" className="ms-auto -me-2 lg:hidden" />}
          >
            <ListIcon aria-hidden />
            {menuLabel}
          </DialogTrigger>
          <DialogContent size="full" closeLabel={closeLabel} className="gap-8">
            <div className="flex h-12 items-center pe-14">{brand}</div>
            <DialogTitle className="sr-only">{menuLabel}</DialogTitle>
            <nav aria-label={navLabel}>
              <RouteList orientation="vertical">
                {links.map((link) => {
                  const current = isCurrentHref(link.href, currentHref)
                  return (
                    <RouteStop key={link.href} state={current ? "here" : "upcoming"}>
                      <Link
                        href={link.href}
                        aria-current={current ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className="-mt-1.5 type-heading-md text-text underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </RouteStop>
                  )
                })}
              </RouteList>
            </nav>
            <div className="mt-auto flex flex-col gap-4 border-t pt-6">
              {languageSwitcher}
              {account}
              {menuExtras}
            </div>
          </DialogContent>
        </Dialog>
      </Container>
    </header>
  )
}

export { SiteHeader }
