"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { InstagramLogoIcon, UserIcon } from "@phosphor-icons/react"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
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

/** "Sign in", or the signed-in buyer's first name, linking to their orders. */
function Account({ name }: { name: string | null }) {
  if (name === null) {
    return (
      <Link href="/sign-in" className={buttonVariants({ size: "sm" })}>
        <UserIcon aria-hidden />
        Sign in
      </Link>
    )
  }
  return (
    <Link href="/orders" className={buttonVariants({ size: "sm", className: "max-w-48" })}>
      <UserIcon aria-hidden />
      <span className="truncate">{name.split(" ")[0] || "Account"}</span>
    </Link>
  )
}

/**
 * Header and footer around every buyer page. `buyerName` is the signed-in
 * buyer's name ("" when they haven't set one), or null when signed out.
 * `accountHref` is PPITSZ Account, where the buyer's details and password live.
 */
export function SiteChrome({
  buyerName,
  accountHref,
  children,
}: {
  buyerName: string | null
  accountHref: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        brand={<Brand />}
        links={LINKS}
        currentHref={pathname}
        linkAs={Link}
        account={<Account name={buyerName} />}
        menuExtras={<ThemeControl />}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter
        sitemap={[...SITEMAP, { href: accountHref, label: "PPITSZ account" }]}
        currentHref={pathname}
        linkAs={Link}
        brand={<PpiMark className="h-12" />}
        about={
          <>
            PPITSZ Shop is run by Danus of PPI Tiongkok Cabang Shenzhen. A problem with an order? Contact Danus
            {CONTACT.wechatId ? ` on WeChat at ${CONTACT.wechatId}` : " on the PPITSZ socials"} and give your order
            code.
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
            <p className="type-caption text-muted">© {new Date().getFullYear()} PPIT Shenzhen · Danus</p>
            <ThemeControl className="shrink-0" />
          </>
        }
      />
    </div>
  )
}
