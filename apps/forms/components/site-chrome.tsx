"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ProfileMenu, type ProfileMenuAccount } from "@ppitsz/ui/components/blocks/profile-menu"
import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import type { TransferLink } from "@ppitsz/ui/lib/nav"
import { responderSignOutAction } from "@/lib/actions/respond"

const LINKS = [{ href: "/", label: "Forms" }]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <PpiMark className="h-9" />
      <span className="type-heading-sm text-text">PPITSZ Forms</span>
    </Link>
  )
}

/**
 * Header and footer around every responder page. A form needs no account, so
 * signing in is offered, never asked for. `me` is the signed-in person for
 * the profile menu, or null; `signInHref` and `accountHref` lead to PPITSZ
 * Account; `transfers` are the other PPITSZ apps. All from the server.
 */
export function SiteChrome({
  me,
  signInHref,
  accountHref,
  transfers,
  children,
}: {
  me: ProfileMenuAccount | null
  signInHref: string
  accountHref: string
  transfers: TransferLink[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const account = (
    <ProfileMenu
      account={me}
      signInHref={signInHref}
      accountHref={accountHref}
      signOut={responderSignOutAction}
      linkAs={Link}
    />
  )
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={LINKS}
        currentHref={pathname}
        transfers={transfers}
        linkAs={Link}
        account={account}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter
        sitemap={LINKS}
        currentHref={pathname}
        linkAs={Link}
        brand={<PpiMark className="h-12" />}
        about={<>Event registration and forms of PPI Tiongkok Cabang Shenzhen.</>}
        transfers={transfers}
        help={
          <>
            <p>A question about an event? Contact us on the PPITSZ socials.</p>
            <p>Lost your ticket? Open the form again and choose “Find it by email”.</p>
          </>
        }
        bottom={
          <>
            <p className="type-caption text-muted">© {new Date().getFullYear()} PPIT Shenzhen</p>
            <ThemeControl className="shrink-0" />
          </>
        }
      />
    </div>
  )
}
