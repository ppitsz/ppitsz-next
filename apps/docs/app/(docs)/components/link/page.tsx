import type { Metadata } from "next"

import { Link } from "@ppitsz/ui/components/link"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Link" }

const SECTIONS = [
  { id: "inline", label: "Inline" },
  { id: "standalone", label: "Standalone" },
  { id: "external", label: "External" },
  { id: "rules", label: "Rules" },
]

export default function LinkPage() {
  return (
    <DocPage
      href="/components/link"
      kicker="Components · Jaringan"
      title="Link"
      lede="Not a shadcn component: shadcn styles links as a Button variant, which Jaringan drops so a link never looks like a button. Pass as={NextLink} for client navigation."
      sections={SECTIONS}
    >
      <DocSection id="inline" title="Inline" intro={<p>In running text: <code>accent-text</code>, always underlined. The underline thickens on hover.</p>}>
        <Example layout="block" code={`<p>Read the <Link href="/faq">frequently asked questions</Link> before you register.</p>`}>
          <p className="max-w-[60ch] type-body text-text">
            Read the <Link href="#inline">frequently asked questions</Link> before you register. You can
            choose an interview slot on the <Link href="#inline">status page</Link>.
          </p>
        </Example>
      </DocSection>

      <DocSection id="standalone" title="Standalone" intro={<p>Below a list or a section: <code>type-ui</code> in text color, underline on hover, and the arrow nudges 2px where motion is allowed.</p>}>
        <Example code={`<Link variant="standalone" as={NextLink} href="/events">See all events</Link>`}>
          <Link variant="standalone" href="#standalone">See all events</Link>
          <Link variant="standalone" href="#standalone">All news</Link>
        </Example>
      </DocSection>

      <DocSection
        id="external"
        title="External"
        intro={<p>A trailing <code>ArrowUpRight</code>. New tabs only for Drive/SharePoint galleries, external forms and PDFs, each with the screen-reader note “(opens in a new tab)”.</p>}
      >
        <Example code={`<Link href="https://…" external newTab>Gallery on Google Drive</Link>`}>
          <p className="type-body text-text">
            Every photo is in the <Link href="https://example.com" external newTab>Google Drive gallery</Link>.
          </p>
          <Link variant="standalone" href="https://example.com" external newTab>Download the guide (PDF)</Link>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>The link text names its destination by itself.</li>
            <li>Inline links never lose their underline. Visited links are not styled. Links are never disabled; remove them instead.</li>
            <li>The current page uses <code>aria-current=&quot;page&quot;</code> plus a station marker (see Header).</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>“Click here” or “Learn more”.</p>}
          doThis={<p>“See all events”, “Read the visa guide”.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
