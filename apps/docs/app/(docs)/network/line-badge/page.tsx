import type { Metadata } from "next"

import { LineBadge, LineBadges } from "@ppitsz/ui/components/network/line-badge"
import { DIVISIONS } from "@ppitsz/ui/lib/network"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Line badge" }

const SECTIONS = [
  { id: "badges", label: "The eight lines" },
  { id: "interchange", label: "Interchange" },
  { id: "codes", label: "Codes" },
  { id: "rules", label: "Rules" },
]

export default function LineBadgePage() {
  return (
    <DocPage
      href="/network/line-badge"
      kicker="Network · line-badge"
      title="Line badge"
      lede="The division code in its line color, like a metro line bullet. The code is always visible; screen readers hear the full division name."
      sections={SECTIONS}
    >
      <DocSection id="badges" title="The eight lines" intro={<p>Condensed Archivo (wdth 75), 12px caps, a small radius rather than a capsule, so a code doesn't look like a button.</p>}>
        <Example code={`<LineBadge code="humas" />`}>
          {DIVISIONS.map((d) => (
            <LineBadge key={d.code} code={d.code} />
          ))}
        </Example>
      </DocSection>

      <DocSection id="interchange" title="Interchange" intro={<p>Two or more divisions on one event render as an interchange: badges side by side, joined by a short ink connector.</p>}>
        <Example code={`<LineBadges codes={["sosbud", "medkref"]} />`}>
          <LineBadges codes={["sosbud", "medkref"]} />
          <LineBadges codes={["pka", "humas", "it"]} />
        </Example>
      </DocSection>

      <DocSection id="codes" title="Codes" intro={<p>The long codes are canonical for display. The old codebase&apos;s recruitment codes (<code>DU</code>, <code>DO</code>, <code>HM</code>, <code>MK</code>, <code>SB</code>) map through <code>toLineCode()</code>.</p>}>
        <SpecTable
          head={["Badge", "data-line", "Division"]}
          rows={DIVISIONS.map((d) => [
            <LineBadge key="b" code={d.code} />,
            <code key="c">{d.code}</code>,
            <span key="n" lang="id">{d.name}</span>,
          ])}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>It appears on event rows and station pages, committee section headers, member cards (as a station marker), article kickers and the recruitment “Accepted” result.</li>
            <li>Its accessible name is the full Indonesian division name, marked <code>lang=&quot;id&quot;</code>: a proper name, never translated (ADR 0007). The visible code is wrapped in <code>&lt;abbr title&gt;</code> for pointer users.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A line badge used as a button, or a division color used for text.</p>}
          doThis={<p>To filter by division, put the badge inside a filter chip.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
