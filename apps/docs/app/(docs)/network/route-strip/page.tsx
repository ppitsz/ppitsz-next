import type { Metadata } from "next"

import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"

export const metadata: Metadata = { title: "Route strip" }

const SECTIONS = [
  { id: "live", label: "In these docs" },
  { id: "behavior", label: "Behavior" },
  { id: "usage", label: "Usage" },
  { id: "rules", label: "Rules" },
]

export default function RouteStripPage() {
  return (
    <DocPage
      href="/network/route-strip"
      kicker="Network · route-strip"
      title="Route strip"
      lede="In-page wayfinding for long pages: each section heading is a station. Passed sections are filled and the one in view has the halo."
      sections={SECTIONS}
    >
      <DocSection
        id="live"
        title="In these docs"
        intro={
          <p>
            Every page of these docs with three or more sections has one. On a wide screen it runs
            down the right gutter; below that, it is the row of section links under the page
            title. Scroll this page and watch the stations fill.
          </p>
        }
      />

      <DocSection
        id="behavior"
        title="Behavior"
        intro={
          <ul className="flex list-disc flex-col gap-2 ps-6">
            <li>A small client component watches the headings with <code>IntersectionObserver</code>: the section in view becomes “here” (<code>aria-current=&quot;location&quot;</code>), sections above it “passed”.</li>
            <li>State changes over 200ms; instantly under reduced motion.</li>
            <li>With JavaScript off it is a plain list of links.</li>
          </ul>
        }
      />

      <DocSection id="usage" title="Usage">
        <CodeBlock
          code={`const sections = [
  { id: "about", label: "About us" },
  { id: "vision", label: "Vision and mission" },
  { id: "sejarah", label: "Sejarah" },
]

// sticky in the gutter from lg up
<aside className="hidden lg:block">
  <div className="sticky top-24"><RouteStrip sections={sections} /></div>
</aside>

// under the page title below lg
<RouteStrip variant="strip" sections={sections} className="lg:hidden" />

// each h2 carries the matching id
<h2 id="about" className="type-display-lg scroll-mt-24">About us</h2>`}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Only on pages with 3 or more <code>h2</code> sections: About, Kepengurusan, event detail, articles.</li>
            <li>On the org site it runs down the <strong>left</strong> gutter. These docs put it on the right because the docs navigation holds the left.</li>
            <li>The <code>aria-label</code> defaults to “On this page”.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
