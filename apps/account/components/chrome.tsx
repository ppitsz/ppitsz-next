"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
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
 * only. Signing out here signs out of every app.
 */
export function Chrome({
  account,
  children,
}: {
  account: { name: string; portalAdmin: boolean } | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const links = account
    ? [{ href: "/", label: "Your account" }, ...(account.portalAdmin ? [{ href: "/accounts", label: "Accounts" }] : [])]
    : []

  const signedIn = account && (
    <div className="flex items-center gap-3">
      <span className="max-w-48 truncate type-ui text-text">{account.name}</span>
      <form action={signOutAction}>
        <Button type="submit" variant="quiet" size="sm">
          <SignOutIcon aria-hidden />
          Sign out
        </Button>
      </form>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={links}
        currentHref={pathname.startsWith("/accounts") ? "/accounts" : pathname}
        linkAs={Link}
        account={signedIn}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <footer className="border-t">
        <Container className="flex items-center justify-between gap-4 py-6">
          <p className="type-caption text-muted">PPITSZ Account · one account for every PPIT Shenzhen app</p>
          <ThemeControl className="shrink-0" />
        </Container>
      </footer>
    </div>
  )
}
