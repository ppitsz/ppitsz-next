"use client"

import * as React from "react"
import { ListIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { isCurrentHref, type NavLink, type TransferLink } from "@ppitsz/ui/lib/nav"
import { useNavigationPending } from "@ppitsz/ui/hooks/use-navigation-pending"
import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@ppitsz/ui/components/navigation-menu"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"

/*
 * Header. Sticky, solid bg, hairline bottom border; never transparent
 * over the hero, never hidden on scroll. Along the top runs the app's line,
 * like the stripe on a train car; while the next page loads, a station
 * travels it. On desktop the nav is a NavigationMenu: the links are
 * capsules, the current one with a small dot in the app's line, and
 * "Transfer" opens a panel of the other PPITSZ apps, as an interchange's
 * signs list its lines (on click as well as hover, so never hover-only).
 * On phones a "Menu" button opens a full-screen dialog where the links are
 * stations on a route, then the transfers.
 */

function SiteHeader({
  brand,
  cabinet,
  links,
  currentHref,
  line,
  transfers = [],
  languageSwitcher,
  account,
  menuExtras,
  linkAs,
  navLabel = "Main",
  menuLabel = "Menu",
  closeLabel = "Close",
  transferLabel = "Transfer",
  loadingLabel = "Loading the page",
  className,
}: {
  /** The PPI mark + wordmark, linked home. */
  brand: React.ReactNode
  /** The yearly cabinet mark, shown after a thin divider on desktop. */
  cabinet?: React.ReactNode
  links: NavLink[]
  currentHref?: string
  /** The app's line: the stripe and the current-page dot. Brand red by default. */
  line?: LineCode
  /** The other PPITSZ apps. Full URLs, opened as normal links. */
  transfers?: TransferLink[]
  languageSwitcher?: React.ReactNode
  /** "Sign in" or the account menu. Reserve its size so the header never shifts. */
  account?: React.ReactNode
  /** Extra controls at the bottom of the mobile menu (e.g. ThemeControl). */
  menuExtras?: React.ReactNode
  linkAs?: React.ElementType
  navLabel?: string
  menuLabel?: string
  closeLabel?: string
  transferLabel?: string
  loadingLabel?: string
  className?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const [open, setOpen] = React.useState(false)
  const pending = useNavigationPending(currentHref)

  return (
    <header
      data-slot="site-header"
      data-line={line}
      className={cn("sticky top-0 z-40 border-b bg-bg", className)}
    >
      <div aria-hidden className="line-stripe">
        {pending && <span className="stripe-train" />}
      </div>
      <span role="status" className="sr-only">
        {pending ? loadingLabel : ""}
      </span>
      <Container className="flex h-16 items-center gap-6">
        {/* Beside the desktop nav the brand never shrinks under it. */}
        <div className="flex min-w-0 items-center gap-4 lg:shrink-0">
          {brand}
          {cabinet && (
            <span className="hidden items-center border-s ps-4 lg:flex">{cabinet}</span>
          )}
        </div>

        <NavigationMenu aria-label={navLabel} align="end" className="ms-auto hidden lg:flex">
          <NavigationMenuList>
            {links.map((link) => {
              const current = isCurrentHref(link.href, currentHref)
              return (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink
                    render={<Link href={link.href} />}
                    active={current}
                    aria-current={current ? "page" : undefined}
                    className={navigationMenuTriggerStyle()}
                  >
                    {link.label}
                    {current && (
                      <span
                        aria-hidden
                        className="absolute bottom-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-(--line)"
                      />
                    )}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
            {transfers.length > 0 && (
              <NavigationMenuItem>
                {/* Icon-only until xl, where the label has room beside the links. */}
                <NavigationMenuTrigger aria-label={transferLabel}>
                  <span aria-hidden className="station-interchange scale-75" />
                  <span aria-hidden className="hidden xl:inline">
                    {transferLabel}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="flex w-80 flex-col gap-1">
                    <p className="px-3 pt-2 pb-2 type-kicker text-muted">{transferLabel} to</p>
                    <ul className="flex flex-col gap-1">
                      {transfers.map((app) => (
                        <li key={app.href}>
                          <NavigationMenuLink
                            render={<a href={app.href} />}
                            className="min-h-16 flex-col items-start justify-center gap-1 py-3"
                          >
                            <span className="type-ui text-text">{app.label}</span>
                            {app.description && (
                              <span className="type-caption text-muted">{app.description}</span>
                            )}
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

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
            <nav aria-label={navLabel} data-line={line}>
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
            {transfers.length > 0 && (
              <nav aria-label={transferLabel} className="flex flex-col gap-3">
                <p className="flex items-center gap-3 type-kicker text-muted">
                  <span aria-hidden className="station-interchange scale-75" />
                  {transferLabel} to
                </p>
                <ul className="flex flex-col">
                  {transfers.map((app) => (
                    <li key={app.href} className="border-b last:border-b-0">
                      <a
                        href={app.href}
                        className="flex min-h-14 flex-col justify-center gap-0.5 py-2 underline-offset-4 hover:underline"
                      >
                        <span className="type-ui text-text">{app.label}</span>
                        {app.description && (
                          <span className="type-caption text-muted">{app.description}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
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
