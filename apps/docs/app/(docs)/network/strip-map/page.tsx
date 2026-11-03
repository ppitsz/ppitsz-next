import type { Metadata } from "next"

import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Strip map" }

const SECTIONS = [
  { id: "map", label: "Strip map" },
  { id: "states", label: "States" },
  { id: "screen", label: "Screen" },
  { id: "rules", label: "Rules" },
]

const ORDER = [
  { label: "Order", note: "Nov 2" },
  { label: "Pay", note: "Nov 2" },
  { label: "Verify" },
  { label: "Pick up" },
]

export default function StripMapPage() {
  return (
    <DocPage
      href="/network/strip-map"
      kicker="Network · strip-map"
      title="Strip map"
      lede="The route map above a train's doors: a short horizontal route with a reading line that says what comes next. For an order on its way, or a ticket's days."
      sections={SECTIONS}
    >
      <DocSection
        id="map"
        title="Strip map"
        intro={
          <p>
            The reading line is what people scan: <em>Next</em> and <em>Towards</em>, as in the
            train. The route below shows where it is. Always horizontal, so keep it to six stops or
            fewer; the route tracker is for longer journeys with panels.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<StripMap
  line="danus"
  stops={[{ label: "Order" }, { label: "Pay" }, { label: "Verify" }, { label: "Pick up" }]}
  current={2}
  status={<StatusBadge domain="order" value="awaiting_verification" />}
  aria-label="Order progress"
/>`}
        >
          <StripMap
            line="danus"
            stops={ORDER}
            current={2}
            status={<StatusBadge domain="order" value="awaiting_verification" />}
            aria-label="Order progress"
          />
        </Example>
      </DocSection>

      <DocSection id="states" title="States">
        <Example
          lang="en"
          layout="stack"
          code={`<StripMap stops={stops} current={3} state="arrived" />
<StripMap stops={stops} current={1} state="stopped" />`}
        >
          <StripMap
            line="danus"
            stops={ORDER}
            current={3}
            status={<StatusBadge domain="order" value="paid" />}
            aria-label="Order progress"
          />
          <StripMap
            line="danus"
            stops={ORDER}
            current={3}
            state="arrived"
            status={<StatusBadge domain="order" value="picked_up" />}
            aria-label="Order progress"
          />
          <StripMap
            line="danus"
            stops={ORDER}
            current={1}
            state="stopped"
            status={<StatusBadge domain="order" value="expired" />}
            aria-label="Order progress"
          />
        </Example>
        <SpecTable
          head={["State", "Reading line", "Route"]}
          rows={[
            ["running", "Next · the next stop, Towards · the last one. At the last stop: Now at.", "Passed stops filled, the current one with the halo."],
            ["arrived", "Arrived · the last stop.", "Every stop filled."],
            ["stopped", "Stopped at · the current stop.", "A danger terminus after it; later stops gray out. Say why in the status."],
          ]}
        />
      </DocSection>

      <DocSection
        id="screen"
        title="Screen"
        intro={<p>With <code>screen</code> it sits in an ink band, like the display in the carriage. Use it where the map is the subject: the top of an order&apos;s own page.</p>}
      >
        <Example lang="en" layout="block" code={`<StripMap screen line="danus" stops={stops} current={1} />`}>
          <StripMap screen line="danus" stops={ORDER} current={1} aria-label="Order progress" />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>An <code>&lt;ol&gt;</code> with <code>aria-current=&quot;step&quot;</code> on the current stop; the reading line repeats it in words.</li>
            <li>Stops are nouns from the screen (Order, Pay, Verify, Pick up), not statuses. The status badge says the status.</li>
            <li>Nothing blinks: the halo is static, as everywhere.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A percentage progress bar, or a stepper with numbered circles.</p>}
          doThis={<p>The strip map on the campaign&apos;s line, with the next stop named.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
