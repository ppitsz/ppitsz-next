import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { Container } from "@ppitsz/ui/components/container"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { ExitBadge } from "@ppitsz/ui/components/network/sign"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { isCurrentHref, type NavLink, type TransferLink } from "@ppitsz/ui/lib/nav"

/*
 * Footer: a tone-ink band. On top, the "network map" footer: a single
 * red route whose stations are the main sections — the footer's navigation,
 * drawn as a line. Below: the white PPI mark and cabinet mark, the
 * organization line, contact, social links with visible labels, WeChat.
 * The social links leave the site, so each is an exit: A, B, C in order.
 * Then the station board's last row: Transfer (the other PPITSZ apps, as an
 * interchange lists its lines) and Help (where to go when something's wrong).
 * Bottom row: copyright, language switcher, theme control.
 */

const EXIT_LETTERS = "ABCDEFGH"

export interface SocialLink {
  href: string
  label: string
  icon: React.ReactNode
}

function SiteFooter({
  sitemap,
  currentHref,
  line,
  brand,
  about,
  contact,
  socials = [],
  wechat,
  transfers = [],
  help,
  bottom,
  linkAs,
  sitemapLabel = "Site map",
  socialsLabel = "Social media",
  transferLabel = "Transfer",
  helpLabel = "Help",
  className,
}: {
  sitemap: NavLink[]
  currentHref?: string
  /** The app's line, as in the header. Set inside the ink, so it takes its dark value. */
  line?: LineCode
  /** PpiMark (white in tone-ink) + cabinet mark. */
  brand: React.ReactNode
  /** "Perhimpunan Pelajar Indonesia di Tiongkok Cabang Shenzhen · Didirikan 2018" */
  about: React.ReactNode
  /** The contact email link. */
  contact?: React.ReactNode
  socials?: SocialLink[]
  /** WeChatDialog. */
  wechat?: React.ReactNode
  /** The other PPITSZ apps. */
  transfers?: TransferLink[]
  /** Where to go when something's wrong: one or two short sentences. */
  help?: React.ReactNode
  /** Copyright, LanguageSwitcher, ThemeControl. */
  bottom: React.ReactNode
  linkAs?: React.ElementType
  sitemapLabel?: string
  socialsLabel?: string
  transferLabel?: string
  helpLabel?: string
  className?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"

  const stops = (orientation: "horizontal" | "vertical") =>
    sitemap.map((link) => {
      const current = isCurrentHref(link.href, currentHref)
      return (
        <RouteStop key={link.href} state={current ? "here" : "passed"} draw={orientation === "horizontal"}>
          <Link
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "type-sign text-text underline-offset-4 hover:underline",
              orientation === "vertical" && "type-ui"
            )}
          >
            {link.label}
          </Link>
        </RouteStop>
      )
    })

  return (
    <footer data-slot="site-footer" className={cn("tone-ink", className)}>
      <Container className="flex flex-col gap-12 py-12 lg:py-16">
        {sitemap.length > 0 && (
          <nav aria-label={sitemapLabel} data-line={line}>
            <RouteList orientation="vertical" className="md:hidden">
              {stops("vertical")}
            </RouteList>
            <RouteList orientation="horizontal" className="hidden md:flex">
              {stops("horizontal")}
            </RouteList>
          </nav>
        )}

        <div className="grid gap-10 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-12">
          <div className="flex items-center gap-4">{brand}</div>
          <div className="flex max-w-[50ch] flex-col gap-3">
            <p className="type-body-sm text-text">{about}</p>
            {contact && <p className="type-body-sm">{contact}</p>}
          </div>
          {(socials.length > 0 || wechat) && (
            <div className="flex flex-col gap-1">
              <h2 className="type-heading-sm text-text">{socialsLabel}</h2>
              <ul className="flex flex-col">
                {socials.map((social, i) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 type-ui text-text underline-offset-4 hover:underline [&_svg]:size-5"
                    >
                      <ExitBadge letter={EXIT_LETTERS[i] ?? String(i + 1)} />
                      {social.icon}
                      {social.label}
                    </a>
                  </li>
                ))}
                {wechat && <li>{wechat}</li>}
              </ul>
            </div>
          )}
        </div>

        {(transfers.length > 0 || help) && (
          <div className="grid gap-10 border-t pt-8 md:grid-cols-2 md:gap-12">
            {transfers.length > 0 && (
              <nav aria-label={transferLabel} className="flex flex-col gap-3">
                <h2 className="flex items-center gap-3 type-heading-sm text-text">
                  <span aria-hidden className="station-interchange scale-75" />
                  {transferLabel}
                </h2>
                <ul className="flex flex-col">
                  {transfers.map((app) => (
                    <li key={app.href}>
                      <a
                        href={app.href}
                        className="flex min-h-11 flex-col justify-center py-1 underline-offset-4 hover:underline"
                      >
                        <span className="type-ui text-text">{app.label}</span>
                        {app.description && <span className="type-caption text-muted">{app.description}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            {help && (
              <div className="flex flex-col gap-3">
                <h2 className="type-heading-sm text-text">{helpLabel}</h2>
                <div className="flex max-w-[50ch] flex-col gap-2 type-body-sm text-text [&_a]:underline [&_a]:underline-offset-4">
                  {help}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t pt-6 md:flex-row md:flex-wrap md:items-center md:justify-between">
          {bottom}
        </div>
      </Container>
    </footer>
  )
}

export { SiteFooter }
