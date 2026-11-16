"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { StorefrontIcon } from "@phosphor-icons/react"

import { Container } from "@ppitsz/ui/components/container"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ProfileMenu, type ProfileMenuAccount } from "@ppitsz/ui/components/blocks/profile-menu"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { notify } from "@ppitsz/ui/components/sonner"
import { signOutAction } from "@/lib/actions/staff"
import { STAFF_ROLE_LABELS, type StaffRole } from "@/lib/staff-roles"
import { useVisiblePoll } from "@/lib/client/use-visible-poll"
import { BuyerMessageProvider } from "./staff/buyer-message"

function Brand() {
  return (
    <Link href="/staff" className="flex items-center gap-3">
      <PpiMark className="h-9" />
      <span className="flex items-center gap-2">
        <span className="type-heading-sm text-text">PPITSZ Shop</span>
        <LineBadge code="danus" />
        <span className="type-sign text-muted">Dashboard</span>
      </span>
    </Link>
  )
}

/** Every 20 s while the dashboard is open and visible. */
const queueDelay = () => 20_000

/**
 * The live number of proofs waiting. Starts from the server's count, polls
 * for changes, says when new proofs arrive, and refreshes the queue page so
 * proofs another admin handled disappear.
 */
function useAwaitingCount(serverCount: number, enabled: boolean) {
  const router = useRouter()
  const pathname = usePathname()
  const [count, setCount] = useState(serverCount)
  const [lastServerCount, setLastServerCount] = useState(serverCount)
  // A new server render (after an action or navigation) wins over the polled value.
  if (serverCount !== lastServerCount) {
    setLastServerCount(serverCount)
    setCount(serverCount)
  }

  useVisiblePoll(
    async () => {
      const res = await fetch("/staff/queue", { cache: "no-store" })
      if (!res.ok) return
      const { awaiting } = (await res.json()) as { awaiting: number }
      if (awaiting === count) return
      if (awaiting > count) {
        notify.info(`${awaiting - count} new ${awaiting - count === 1 ? "proof" : "proofs"} of payment came in.`)
      }
      setCount(awaiting)
      if (pathname === "/staff/verify") router.refresh()
    },
    queueDelay,
    enabled
  )
  return count
}

/**
 * Header for the Shop dashboard. Signed out (the login page): brand only.
 * `staff` is the signed-in person for the profile menu, with their role;
 * `accountHref` is PPITSZ Account, where their photo and details live.
 */
export function StaffChrome({
  staff,
  accountHref,
  awaitingCount = 0,
  children,
}: {
  staff: (Omit<ProfileMenuAccount, "role"> & { role: StaffRole }) | null
  accountHref: string
  awaitingCount?: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const count = useAwaitingCount(awaitingCount, staff?.role === "admin")
  const isAdmin = staff?.role === "admin"

  const links = !staff
    ? []
    : [
        ...(isAdmin
          ? [{ href: "/staff/verify", label: count > 0 ? `Verify (${count})` : "Verify" }]
          : []),
        { href: "/staff/scan", label: "Scan" },
        { href: "/staff/delivery", label: "Delivery" },
        { href: "/staff/register", label: "Register" },
        { href: "/staff/orders", label: "Orders" },
        ...(isAdmin
          ? [
              { href: "/staff/recap", label: "Recap" },
              { href: "/staff/products", label: "Products" },
              { href: "/staff/settings", label: "Settings" },
            ]
          : []),
      ]

  const account = staff && (
    <ProfileMenu
      account={{ ...staff, role: STAFF_ROLE_LABELS[staff.role] }}
      signInHref="/staff"
      accountHref={accountHref}
      links={[{ href: "/", label: "The shop", icon: <StorefrontIcon aria-hidden /> }]}
      signOut={signOutAction}
      linkAs={Link}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={links}
        currentHref={pathname}
        line="danus"
        linkAs={Link}
        account={account}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        <BuyerMessageProvider>{children}</BuyerMessageProvider>
      </main>
      <footer className="border-t">
        <Container className="flex items-center justify-between gap-4 py-6">
          <p className="type-caption text-muted">Shop dashboard · staff only</p>
          <ThemeControl className="shrink-0" />
        </Container>
      </footer>
    </div>
  )
}
