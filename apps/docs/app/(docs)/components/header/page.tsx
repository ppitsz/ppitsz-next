import type { Metadata } from "next"

import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import {
  CabinetSlot,
  ORG_LINKS,
  OrgBrand,
  OrgLanguageSwitcher,
  SignInButton,
} from "@/components/docs/org-chrome"

export const metadata: Metadata = { title: "Header" }

const TRANSFERS = [
  { href: "#", label: "PPITSZ Shop", description: "Food and merchandise from Danus" },
  { href: "#", label: "PPITSZ Forms", description: "Event sign-ups and tickets" },
]

const SECTIONS = [
  { id: "header", label: "Header" },
  { id: "stripe", label: "Line stripe" },
  { id: "transfer", label: "Transfer" },
  { id: "mobile", label: "Mobile menu" },
  { id: "language", label: "Language switcher" },
  { id: "rules", label: "Rules" },
]

export default function HeaderPage() {
  return (
    <DocPage
      href="/components/header"
      kicker="Components · Jaringan block"
      title="Header"
      lede="The PPI mark and wordmark, the cabinet slot, five links and the account. Sticky and solid. The current page gets a small red station dot, the only red in the header."
      sections={SECTIONS}
    >
      <DocSection id="header" title="Header" intro={<p>Built on the Navigation Menu (shadcn, on Base UI): the links are capsules, and this preview shows “Events” as the current page, marked with a small dot in the app&apos;s line. Narrow your window below 64rem to get the Menu button.</p>}>
        <Example
          layout="block"
          frameClassName="p-0 sm:p-0"
          code={`<SiteHeader
  brand={<OrgBrand />}
  cabinet={<CabinetSlot />}
  links={[{ href: "/events", label: "Events" }, …]}
  currentHref={usePathname()}
  account={<SignInButton />}
  menuExtras={<ThemeControl />}
  linkAs={NextLink}
/>`}
        >
          <SiteHeader
            brand={<OrgBrand />}
            cabinet={<CabinetSlot />}
            links={ORG_LINKS}
            currentHref="/events"
            account={<SignInButton />}
            menuExtras={<ThemeControl />}
            className="static"
          />
        </Example>
      </DocSection>

      <DocSection
        id="stripe"
        title="Line stripe"
        intro={
          <p>
            Along the top of every page runs the app&apos;s line, like the stripe on a train car:
            Danus orange in the shop, brand red elsewhere. While the next page loads, a station
            travels the stripe, the header&apos;s loading indicator; screen readers hear
            &ldquo;Loading the page&rdquo;. It starts on a click to another path of the site and stops when
            the path changes (<code>useNavigationPending</code>), so it needs no router.
          </p>
        }
      />

      <DocSection
        id="transfer"
        title="Transfer"
        intro={
          <p>
            The other PPITSZ apps, as an interchange lists its lines: a Navigation Menu trigger with the
            interchange mark (its label shows from 80rem) opens them, each with one line on what is there. On phones they sit
            in the menu under the links, and the footer repeats them. The URLs come from the
            server (<code>transferApps()</code> in <code>@ppitsz/accounts/urls</code>), since they are env.
            Only the apps have it; a header with many links, like the organization site&apos;s, leaves it out.
          </p>
        }
      >
        <Example
          layout="block"
          frameClassName="p-0 sm:p-0"
          code={`<SiteHeader
  brand={<ShopBrand />}
  links={[{ href: "/", label: "Campaigns" }, { href: "/orders", label: "Your orders" }]}
  currentHref={usePathname()}
  line="danus"                     // the app's line: stripe and current-page dot
  transfers={transferApps("shop")} // the other PPITSZ apps, from the server
  account={<SignInButton />}
  linkAs={NextLink}
/>`}
        >
          <SiteHeader
            brand={
              <span className="flex items-center gap-2">
                <span className="type-heading-sm text-text">PPITSZ Shop</span>
                <LineBadge code="danus" />
              </span>
            }
            links={[
              { href: "#", label: "Campaigns" },
              { href: "/components/header", label: "Your orders" },
            ]}
            currentHref="/components/header"
            line="danus"
            transfers={TRANSFERS}
            account={<SignInButton />}
            menuExtras={<ThemeControl />}
            className="static"
          />
        </Example>
      </DocSection>

      <DocSection
        id="mobile"
        title="Mobile menu"
        intro={<p>The logo plus a “Menu” button that opens a full-screen dialog. Inside, the links are stations on a vertical route in the app&apos;s line, with the current page as “here”; then Transfer, and the account and theme control below. Focus is trapped and returns to the Menu button.</p>}
      />

      <DocSection
        id="language"
        title="Language switcher"
        intro={<p>An optional <code>languageSwitcher</code> slot. The apps are English-only and leave it empty (ADR 0007); it stays for a site that publishes the same pages in several languages. Each link carries <code>lang</code>, <code>hrefLang</code> and the full language name.</p>}
      >
        <Example code={`<SiteHeader … languageSwitcher={<LanguageSwitcher options={…} current="en" />} />`}>
          <OrgLanguageSwitcher />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li><code>&lt;nav aria-label=&quot;Main&quot;&gt;</code> with a list, and a skip link “Skip to content” as the first focusable element.</li>
            <li>Never transparent over the hero, never hidden on scroll, never color-changing.</li>
            <li>No hover-only dropdowns. “Events” links straight to the events index.</li>
            <li>One line per app, the same on every page of it. The stripe is the header&apos;s only full-width color.</li>
            <li>The train moves only while a page is on its way; under reduced motion it stands still.</li>
            <li>Never show a disabled nav item. The account slot reserves its size while auth loads, so the header never shifts.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A transparent header over a darkened hero photo that turns solid on scroll.</p>}
          doThis={<p>A solid <code>bg</code> header with a hairline border, the same on every page.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
