import type { Metadata } from "next"

import { NetworkMap } from "@ppitsz/ui/components/network/network-map"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"
import { DIVISION_COUNTS } from "@/lib/sample-data"

export const metadata: Metadata = { title: "Network map" }

const SECTIONS = [
  { id: "map", label: "Map" },
  { id: "how", label: "How it's built" },
  { id: "rules", label: "Rules" },
]

export default function NetworkMapPage() {
  return (
    <DocPage
      href="/network/network-map"
      kicker="Network · network-map"
      title="Network map"
      lede="The whole organization on one diagram, for the top of Kepengurusan: every division line meeting at the central interchange, each ending at a station with its member count."
      sections={SECTIONS}
    >
      <DocSection id="map" title="Map" intro={<p>It sits in a <code>tone-ink</code> band. Member counts are illustrative.</p>}>
        <Example
          layout="block"
          defaultMode="ink"
          frameClassName="p-4 sm:p-5"
          code={`<section className="tone-ink">
  <Container className="py-16">
    <NetworkMap divisions={[{ code: "humas", members: 9, href: "#humas" }, …]} linkAs={NextLink} />
  </Container>
</section>`}
        >
          <NetworkMap divisions={DIVISION_COUNTS} />
        </Example>
      </DocSection>

      <DocSection
        id="how"
        title="How it's built"
        intro={
          <ul className="flex list-disc flex-col gap-2 ps-6">
            <li>Inline SVG generated from data, never drawn by hand. Strokes come from the line tokens through <code>data-line</code>, so the map follows dark mode and tone-ink.</li>
            <li>BPH, the main line, runs south; the seven other lines leave at 0°, 45° and 90°.</li>
            <li>Labels sit below horizontal routes and right of vertical ones, clear of every line.</li>
            <li>Below <code>lg</code> the radial drawing gives way to a stack of short horizontal routes, one per division.</li>
          </ul>
        }
      />

      <DocSection id="rules" title="Rules">
        <Prose>
          <p>
            The SVG is <code>aria-hidden</code> and not focusable. The list of division links next to
            it is the accessible, keyboard-reachable version, and it doubles as the phone layout.
            Each division links to its section on the page.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
