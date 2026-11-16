import type { Metadata } from "next"

import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { RouteTrackerDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Route tracker" }

const SECTIONS = [
  { id: "tracker", label: "Tracker" },
  { id: "states", label: "Station states" },
  { id: "rules", label: "Rules" },
]

export default function RouteTrackerPage() {
  return (
    <DocPage
      href="/network/route-tracker"
      kicker="Network · route-tracker"
      title="Route tracker"
      lede="The recruitment applicant's journey as a route: Online form → Written test → Interview → Results. Horizontal on desktop, vertical on phones, with one “You are here”."
      sections={SECTIONS}
    >
      <DocSection
        id="tracker"
        title="Tracker"
        intro={<p>Switch the example between in progress, not selected and accepted. Passed and current stations are pressable; they open that stage&apos;s panel below.</p>}
      >
        <Example
          layout="block"
          code={`<RouteTracker
  stages={stages}
  currentStage={applicant.currentStage}       // 0–3, or 4 when rejected
  rejectedAtStage={applicant.rejectedAtStage}
  acceptedLine={applicant.acceptedAs}          // e.g. "humas"
  selectedStage={selected}
  onSelectStage={setSelected}
/>`}
        >
          <RouteTrackerDemo />
        </Example>
      </DocSection>

      <DocSection id="states" title="Station states">
        <SpecTable
          head={["State", "Shows"]}
          rows={[
            ["Passed", "Filled, with a short result line (“Passed · Sep 16”)."],
            ["Here", "The halo, “You are here”, and what to do next (“Choose an interview slot”)."],
            ["Upcoming", "An empty ring, with its date if known. Not interactive."],
            ["Ended", "currentStage 4 with rejectedAtStage n: the route stops at n with a danger terminus and “Not selected”; later stations gray out. The message is kind and specific, in BPH's voice."],
            ["Accepted", "The final station shows “Accepted” and the division's line badge, and the route continues a short way in that color: the applicant has transferred onto their new line."],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>An <code>&lt;ol&gt;</code> with <code>aria-current=&quot;step&quot;</code> on the current station, and each station&apos;s state in text.</li>
            <li>Nothing loops: the halo is static.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>Emoji stage icons (📝 ✍️ 🎯 🏆) on gradient cards.</p>}
          doThis={<p>The route tracker, with stations, plain stage names, dates and one “You are here”.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
