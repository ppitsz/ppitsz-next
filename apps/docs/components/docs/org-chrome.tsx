import { UserIcon } from "@phosphor-icons/react/ssr"

import { Button } from "@ppitsz/ui/components/button"
import { LanguageSwitcher, PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { WeChatDialog } from "@ppitsz/ui/components/blocks/wechat-dialog"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { Link } from "@ppitsz/ui/components/link"
import { SOCIALS } from "@/components/docs/docs-footer"

/*
 * The org website's header and footer configuration, shared by the Header
 * and Footer pages and the Home example. Links are placeholders. No language
 * switcher: the sites are English (ADR 0007).
 */

export const ORG_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/committee", label: "Committee" },
  { href: "/news", label: "News" },
  { href: "/faq", label: "FAQ" },
  { href: "/forms", label: "Forms" },
]

export const LANGUAGES = [
  { code: "id", short: "ID", name: "Bahasa Indonesia", lang: "id", href: "#" },
  { code: "en", short: "EN", name: "English", lang: "en", href: "#" },
  { code: "zh", short: "中文", name: "中文", lang: "zh-Hans", href: "#" },
]

export function OrgBrand() {
  return (
    <a href="#" className="flex items-center gap-3 rounded-sm">
      <PpiMark className="h-10" alt="" />
      <span className="type-heading-md text-text">PPIT Shenzhen</span>
    </a>
  )
}

/** The cabinet slot: one year's mark. A placeholder until the cabinet supplies it. */
export function CabinetSlot() {
  return (
    <span className="flex h-10 items-center rounded-md border border-dashed border-border-strong px-3 type-caption text-muted">
      Kabinet 2026/2027
    </span>
  )
}

export function OrgLanguageSwitcher() {
  return <LanguageSwitcher options={LANGUAGES} current="en" />
}

export function SignInButton() {
  return (
    <Button variant="quiet" size="sm" nativeButton={false} render={<a href="#" />}>
      <UserIcon aria-hidden />
      Sign in
    </Button>
  )
}

export const ORG_FOOTER_PROPS = {
  sitemap: ORG_LINKS,
  brand: (
    <>
      <PpiMark className="h-16" />
      <span className="h-10 border-s" aria-hidden />
      <CabinetSlot />
    </>
  ),
  about: "Perhimpunan Pelajar Indonesia di Tiongkok Cabang Shenzhen · Founded 2018",
  contact: <Link href="mailto:ppitshenzhen@gmail.com">ppitshenzhen@gmail.com</Link>,
  socials: SOCIALS,
  wechat: <WeChatDialog qrSrc="/samples/qr-placeholder.svg" />,
  bottom: (
    <>
      <p className="type-caption text-muted">© 2026 PPIT Shenzhen</p>
      <ThemeControl />
    </>
  ),
}
