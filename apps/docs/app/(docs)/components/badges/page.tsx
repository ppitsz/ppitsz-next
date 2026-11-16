import type { Metadata } from "next"

import { Badge } from "@ppitsz/ui/components/badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { STATUSES } from "@ppitsz/ui/lib/network"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"
import { FilterChipsDemo, LineFilterDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Tags, status and chips" }

const SECTIONS = [
  { id: "tags", label: "Tags" },
  { id: "status", label: "Status badges" },
  { id: "chips", label: "Filter chips" },
  { id: "rules", label: "Rules" },
]

export default function BadgesPage() {
  const rows = Object.entries(STATUSES).flatMap(([domain, values]) =>
    Object.entries(values).map(([value, label]) => [
      domain,
      <code key="v">{value}</code>,
      label.label,
      <StatusBadge key="b" domain={domain as keyof typeof STATUSES} value={value as never} />,
    ])
  )
  return (
    <DocPage
      href="/components/badges"
      kicker="Components · shadcn badge, toggle"
      title="Tags, status and chips"
      lede="Three kinds, each distinct from the others and from line badges: a neutral tag for categories, a status badge in words, and a capsule chip you press to filter."
      sections={SECTIONS}
    >
      <DocSection id="tags" title="Tags" intro={<p>A category: <code>surface</code> fill, muted <code>type-kicker</code>. Not interactive, so a small radius rather than a capsule.</p>}>
        <Example code={`<Badge>Sports</Badge>`}>
          <Badge>Sports</Badge>
          <Badge>Culture</Badge>
          <Badge>Careers</Badge>
          <Badge>Panduan</Badge>
        </Example>
      </DocSection>

      <DocSection
        id="status"
        title="Status badges"
        intro={<p>Status is always shown in words, from one shared table in <code>@ppitsz/ui/lib/network</code>, so every site says “Fully booked” the same way. Tinted tones carry a small leading dot.</p>}
      >
        <Example code={`<StatusBadge domain="event" value="registration_open" />
<StatusBadge domain="recruitment" value="accepted" suffix="Humas" />`}>
          <StatusBadge domain="event" value="upcoming" />
          <StatusBadge domain="event" value="registration_open" />
          <StatusBadge domain="event" value="full" />
          <StatusBadge domain="event" value="past" />
          <StatusBadge domain="recruitment" value="accepted" suffix="Humas" />
          <StatusBadge domain="recruitment" value="rejected" />
          <StatusBadge domain="content" value="new" />
        </Example>
        <SpecTable head={["Domain", "Value", "Label", "Badge"]} rows={rows} />
      </DocSection>

      <DocSection
        id="chips"
        title="Filter chips"
        intro={<p>A capsule <code>&lt;button aria-pressed&gt;</code> in a <code>role=&quot;group&quot;</code> with a label. Pressed fills with ink and gains a leading <code>Check</code>. Chips filter instantly, so there is no loading state; announce the result in a <code>role=&quot;status&quot;</code> region.</p>}
      >
        <Example layout="stack" code={`<FilterChipGroup aria-label="Filter event categories">
  <FilterChip pressed={on} onPressedChange={setOn}>Sports</FilterChip>
</FilterChipGroup>`}>
          <FilterChipsDemo />
        </Example>
        <Example
          title="Filtering by division"
          description="Line badges are never buttons. To filter by division, put the badge inside a chip: the pressed chip fills with ink like any other, and the badge keeps its line color."
          code={`<FilterChip pressed={on} onPressedChange={setOn}><LineBadge code="humas" /></FilterChip>`}
        >
          <LineFilterDemo />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Tags and badges are static. Chips: hover → <code>surface-strong</code>, focus-visible → global outline, pressed → ink fill, disabled → subtle text.</li>
            <li>When a status changes live (after a booking), announce it in a <code>role=&quot;status&quot;</code> region.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
