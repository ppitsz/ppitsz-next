import type { Metadata } from "next"

import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"
import { ORG_FOOTER_PROPS } from "@/components/docs/org-chrome"

export const metadata: Metadata = { title: "Footer" }

const SECTIONS = [
  { id: "footer", label: "Footer" },
  { id: "rules", label: "Rules" },
]

export default function FooterPage() {
  return (
    <DocPage
      href="/components/footer"
      kicker="Components · Jaringan block"
      title="Footer"
      lede="A tone-ink band. On top, the footer's navigation drawn as a single red route; below, the white PPI mark and cabinet mark, contact, social links with visible labels and WeChat; at the bottom, copyright, language and theme."
      sections={SECTIONS}
    >
      <DocSection id="footer" title="Footer" intro={<p>The WeChat button opens a QR dialog for families and partners in China. The QR here is a placeholder.</p>}>
        <Example
          layout="block"
          frameClassName="p-0 sm:p-0"
          code={`<SiteFooter
  sitemap={links}
  brand={<><PpiMark className="h-16" /><CabinetMark /></>}
  about="Perhimpunan Pelajar Indonesia di Tiongkok Cabang Shenzhen · Founded 2018"
  contact={<Link href="mailto:ppitshenzhen@gmail.com">ppitshenzhen@gmail.com</Link>}
  socials={socials}
  wechat={<WeChatDialog qrSrc="/wechat-qr.png" />}
  transfers={transferApps("shop")}
  help={<p>A problem with an order? Contact us on the PPITSZ socials and give your order code.</p>}
  bottom={<>© 2026 PPIT Shenzhen <ThemeControl /></>}
/>`}
        >
          <SiteFooter
            {...ORG_FOOTER_PROPS}
            currentHref="/news"
            transfers={[
              { href: "#", label: "PPITSZ Shop", description: "Food and merchandise from our campaigns" },
              { href: "#", label: "PPITSZ Forms", description: "Event sign-ups and tickets" },
            ]}
            help={<p>A question about an event? Contact us on the PPITSZ socials.</p>}
          />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>The route links are a <code>&lt;nav aria-label=&quot;Peta situs&quot;&gt;</code> list; the drawing is <code>aria-hidden</code>.</li>
            <li>Social links keep visible labels and an exit letter (A, B, C); external links follow the Link rules.</li>
            <li>The last row is the station board&apos;s: Transfer (the other apps, the header&apos;s list again) and Help (where to go when something&apos;s wrong, in one or two sentences).</li>
            <li>Set <code>line</code> to the app&apos;s line, as in the header.</li>
            <li>The theme control is one button that steps System → Light → Dark, showing the current choice. In tight slots, such as the header&apos;s account slot, pass <code>iconOnly</code>.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
