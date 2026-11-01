import Link from "next/link"
import {
  InstagramLogoIcon,
  LinkedinLogoIcon,
  TiktokLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/ssr"

import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { Link as TextLink } from "@ppitsz/ui/components/link"
import { DOCS_GROUPS } from "@/lib/nav"

export const SOCIALS = [
  { href: "https://www.instagram.com/ppitshenzhen/", label: "Instagram", icon: <InstagramLogoIcon aria-hidden /> },
  { href: "https://www.tiktok.com/@ppitshenzhen", label: "TikTok", icon: <TiktokLogoIcon aria-hidden /> },
  { href: "https://www.linkedin.com/company/ppit-shenzhen/", label: "LinkedIn", icon: <LinkedinLogoIcon aria-hidden /> },
  { href: "https://www.youtube.com/@ppitshenzhen8902", label: "YouTube", icon: <YoutubeLogoIcon aria-hidden /> },
]

export function DocsFooter() {
  return (
    <SiteFooter
      sitemap={[
        { href: "/", label: "Overview" },
        ...DOCS_GROUPS.map((group) => ({ href: group.href, label: group.title })),
      ]}
      linkAs={Link}
      sitemapLabel="Site map"
      socialsLabel="PPIT Shenzhen"
      brand={<PpiMark className="h-16" />}
      about={
        <>
          Jaringan is the design system for the websites of PPIT Shenzhen (Perhimpunan
          Pelajar Indonesia di Tiongkok Cabang Shenzhen), founded 2018.
        </>
      }
      contact={
        <TextLink href="mailto:ppitshenzhen@gmail.com">ppitshenzhen@gmail.com</TextLink>
      }
      socials={SOCIALS}
      bottom={
        <>
          <p className="type-caption text-muted">© 2026 PPIT Shenzhen</p>
          <ThemeControl />
        </>
      }
    />
  )
}
