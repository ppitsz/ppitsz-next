"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TicketIcon } from "@phosphor-icons/react"

import { Container } from "@ppitsz/ui/components/container"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ProfileMenu, type ProfileMenuAccount } from "@ppitsz/ui/components/blocks/profile-menu"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { signOutAction } from "@/lib/actions/staff"

function Brand() {
  return (
    <Link href="/staff" className="flex items-center gap-3">
      <PpiMark className="h-9" />
      <span className="flex items-center gap-2">
        <span className="type-heading-sm text-text">PPITSZ Forms</span>
        <span className="type-sign text-muted">Dashboard</span>
      </span>
    </Link>
  )
}

/**
 * Header for the Forms dashboard. Signed out (the login pages): brand only.
 * `staff` is the signed-in person for the profile menu; `accountHref` is
 * PPITSZ Account, where their photo and details live.
 */
export function StaffChrome({
  staff,
  accountHref = "",
  children,
}: {
  staff: (Omit<ProfileMenuAccount, "role"> & { isAdmin: boolean }) | null
  accountHref?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const links = staff ? [{ href: "/staff", label: "Forms" }] : []

  const account = staff && (
    <ProfileMenu
      account={{ ...staff, role: staff.isAdmin ? "Form admin" : "Organizer" }}
      signInHref="/staff"
      accountHref={accountHref}
      links={[{ href: "/", label: "Open forms", icon: <TicketIcon aria-hidden /> }]}
      signOut={signOutAction}
      linkAs={Link}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={links}
        currentHref={pathname.startsWith("/staff") ? "/staff" : pathname}
        linkAs={Link}
        account={account}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <footer className="border-t">
        <Container className="flex items-center justify-between gap-4 py-6">
          <p className="type-caption text-muted">Forms dashboard · staff only</p>
          <ThemeControl className="shrink-0" />
        </Container>
      </footer>
    </div>
  )
}
