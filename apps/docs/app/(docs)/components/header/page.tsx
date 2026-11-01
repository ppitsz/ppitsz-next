import type { Metadata } from "next"

import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
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

const SECTIONS = [
  { id: "header", label: "Header" },
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
      <DocSection id="header" title="Header" intro={<p>This preview shows “Events” as the current page. Narrow your window below 64rem to get the Menu button.</p>}>
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
        id="mobile"
        title="Mobile menu"
        intro={<p>The logo plus a “Menu” button that opens a full-screen dialog. Inside, the links are stations on a red vertical route, with the current page as “here”; the account and theme control sit below. Focus is trapped and returns to the Menu button.</p>}
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
