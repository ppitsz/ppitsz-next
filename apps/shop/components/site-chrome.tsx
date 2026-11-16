"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { InstagramLogoIcon, QrCodeIcon } from "@phosphor-icons/react"

import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ProfileMenu, type ProfileMenuAccount } from "@ppitsz/ui/components/blocks/profile-menu"
import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import type { TransferLink } from "@ppitsz/ui/lib/nav"
import { buyerSignOutAction } from "@/lib/actions/buyer"
import { CONTACT } from "@/lib/contact"

const LINKS = [
  { href: "/", label: "Campaigns" },
  { href: "/orders", label: "Your orders" },
]

const SITEMAP = [
  { href: "/", label: "Campaigns" },
  { href: "/#how-to-order", label: "How to order" },
  { href: "/orders", label: "Your orders" },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <PpiMark className="h-9" />
      <span className="flex items-center gap-2">
        <span className="type-heading-sm text-text">PPITSZ Shop</span>
        <LineBadge code="danus" />
      </span>
    </Link>
  )
}

/**
 * Header and footer around every buyer page. `me` is the signed-in buyer
 * for the profile menu, or null when signed out; `accountHref` is PPITSZ
 * Account, where their details, photo and password live. `transfers` are the
 * other PPITSZ apps. All three come from the server: the URLs are env.
 */
export function SiteChrome({
  me,
  accountHref,
  transfers,
  children,
}: {
  me: ProfileMenuAccount | null
  accountHref: string
  transfers: TransferLink[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const account = (
    <ProfileMenu
      account={me}
      signInHref="/sign-in"
      accountHref={accountHref}
      links={[{ href: "/orders", label: "Your orders", icon: <QrCodeIcon aria-hidden /> }]}
      signOut={buyerSignOutAction}
      linkAs={Link}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={LINKS}
        currentHref={pathname}
        line="danus"
        transfers={transfers}
        linkAs={Link}
        account={account}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter
        sitemap={SITEMAP}
        currentHref={pathname}
        line="danus"
        linkAs={Link}
        brand={<PpiMark className="h-12" />}
        about={<>PPITSZ Shop is the shop of PPI Tiongkok Cabang Shenzhen.</>}
        transfers={transfers}
        help={
          <>
            <p>
              A problem with an order? Contact us
              {CONTACT.wechatId ? ` on WeChat at ${CONTACT.wechatId}` : " on the PPITSZ socials"} and give your order
              code.
            </p>
            <p>Lost an order link? Every order is in Your orders, once you sign in.</p>
          </>
        }
        contact={
          CONTACT.email ? (
            <a href={`mailto:${CONTACT.email}`} className="text-text underline underline-offset-4">
              {CONTACT.email}
            </a>
          ) : undefined
        }
        socials={
          CONTACT.instagram
            ? [
                {
                  href: `https://www.instagram.com/${CONTACT.instagram}`,
                  label: `@${CONTACT.instagram}`,
                  icon: <InstagramLogoIcon aria-hidden />,
                },
              ]
            : []
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
