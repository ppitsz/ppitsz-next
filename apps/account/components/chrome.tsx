"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ProfileMenu, type ProfileMenuAccount } from "@ppitsz/ui/components/blocks/profile-menu"
import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import type { TransferLink } from "@ppitsz/ui/lib/nav"
import { signOutAction } from "@/lib/actions/account"

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <PpiMark className="h-9" />
      <span className="type-heading-sm text-text">PPITSZ Account</span>
    </Link>
  )
}

/**
 * Header and footer around every page. Signed out (the sign-in pages): brand
 * only. Signing out here signs out of every app. `transfers`: the other
 * PPITSZ apps, from the server.
 */
export function Chrome({
  account,
  transfers,
  children,
}: {
  account: (ProfileMenuAccount & { portalAdmin: boolean }) | null
  transfers: TransferLink[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const links = account
    ? [{ href: "/", label: "Your account" }, ...(account.portalAdmin ? [{ href: "/accounts", label: "Accounts" }] : [])]
    : []

  const signedIn = account && (
    <ProfileMenu
      account={{ ...account, role: account.portalAdmin ? "Portal admin" : undefined }}
      signInHref="/sign-in"
      accountHref="/"
      signOut={signOutAction}
      linkAs={Link}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={links}
        currentHref={pathname.startsWith("/accounts") ? "/accounts" : pathname}
        transfers={transfers}
        linkAs={Link}
        account={signedIn}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter
        sitemap={links}
        currentHref={pathname.startsWith("/accounts") ? "/accounts" : pathname}
        linkAs={Link}
        brand={<PpiMark className="h-12" />}
        about={<>PPITSZ Account: one account for every PPIT Shenzhen app.</>}
        transfers={transfers}
        help={
          <>
            <p>Can&apos;t remember your password? Use &ldquo;Forgot your password?&rdquo; on the sign-in page.</p>
            <p>Account disabled, or another problem? Contact PPITSZ on its socials.</p>
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
