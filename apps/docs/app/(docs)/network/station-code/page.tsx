import type { Metadata } from "next"

import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Station code" }

const SECTIONS = [
  { id: "code", label: "Station code" },
  { id: "where", label: "Where" },
  { id: "rules", label: "Rules" },
]

export default function StationCodePage() {
  return (
    <DocPage
      href="/network/station-code"
      kicker="Network · station-code"
      title="Station code"
      lede="An order or ticket code as a station number: the prefix in the line color, the number in ink, inside a line-colored frame. Codes stop looking like random strings and start looking like part of the network."
      sections={SECTIONS}
    >
      <DocSection
        id="code"
        title="Station code"
        intro={<p>The part before the hyphen is the prefix (a campaign&apos;s code prefix). A code without one, like a Forms ticket code, is the frame alone.</p>}
      >
        <Example lang="en" code={`<StationCode code="GC-7K3P" line="danus" />
<StationCode code="K7P3QX" line="sosbud" />`}>
          <StationCode code="GC-7K3P" line="danus" />
          <StationCode code="SZ-2M4Q" line="depol" />
          <StationCode code="K7P3QX" line="sosbud" />
          <StationCode code="M2Q9TA" />
        </Example>
        <Example lang="en" defaultMode="ink" title="On ink" description="Inside a ticket or a nameplate the frame takes the line's dark value and the number sits on the ink.">
          <StationCode code="GC-7K3P" line="danus" />
          <StationCode code="K7P3QX" line="sosbud" />
        </Example>
      </DocSection>

      <DocSection id="where" title="Where">
        <SpecTable
          head={["Screen", "Use"]}
          rows={[
            ["Your orders, order cards", "The card title: Order GC-7K3P."],
            ["An order's page", "In the nameplate, under the heading."],
            ["Tickets", "The Order cell of a pickup ticket."],
            ["Scanners", "In the gate, beside the holder's name."],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>A network graphic, like the line badge: it may use the line color, nothing else around it may.</li>
            <li>Screen readers hear the code as written. The big code under a QR stays <code>TicketCode</code>, for reading aloud at a door.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A code in monospace gray, or in a colored pill that looks pressable.</p>}
          doThis={<p>The station code, in the campaign&apos;s or event&apos;s line.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
