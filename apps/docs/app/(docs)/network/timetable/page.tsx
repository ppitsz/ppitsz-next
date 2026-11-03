import type { Metadata } from "next"

import { Timetable } from "@ppitsz/ui/components/blocks/timetable"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Timetable" }

const SECTIONS = [
  { id: "timetable", label: "Timetable" },
  { id: "open-ended", label: "Open-ended" },
  { id: "rules", label: "Rules" },
]

export default function TimetablePage() {
  return (
    <DocPage
      href="/network/timetable"
      kicker="Network · timetable"
      title="Timetable"
      lede="The “First train / Last train” sign at a station entrance, for the times that bound something: a campaign's first and last online order and its booth hours, a form's opening and closing."
      sections={SECTIONS}
    >
      <DocSection
        id="timetable"
        title="Timetable"
        intro={<p>Each row is a label and a time, big and tabular, with its date below. Shenzhen time; <code>wib</code> adds the WIB time for family-facing pages.</p>}
      >
        <Example
          lang="en"
          layout="block"
          code={`<Timetable
  title="Ordering hours"
  line="danus"
  rows={[
    { label: "First order", at: campaign.onlineOpensAt },
    { label: "Last order", at: campaign.onlineClosesAt },
    { label: "At the booth", at: booth.start, until: booth.end },
  ]}
/>`}
        >
          <Timetable
            title="Ordering hours"
            line="danus"
            className="max-w-md"
            rows={[
              { label: "First order", at: new Date("2027-03-01T09:00:00+08:00") },
              { label: "Last order", at: new Date("2027-03-15T21:00:00+08:00") },
              {
                label: "At the booth",
                at: new Date("2027-03-17T10:00:00+08:00"),
                until: new Date("2027-03-17T17:00:00+08:00"),
              },
            ]}
          />
        </Example>
      </DocSection>

      <DocSection
        id="open-ended"
        title="Open-ended"
        intro={<p>A side without a limit (a null <code>onlineOpensAt</code>) says so in words.</p>}
      >
        <Example
          lang="en"
          layout="block"
          code={`<Timetable title="Registration" wib rows={[{ label: "Opens", at: null, none: "Open now" }, { label: "Closes", at: closesAt }]} />`}
        >
          <Timetable
            title="Registration"
            line="sosbud"
            wib
            className="max-w-md"
            rows={[
              { label: "Opens", at: null, none: "Open now" },
              { label: "Closes", at: new Date("2026-11-10T23:59:00+08:00") },
            ]}
          />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Two to four rows. Labels are the moment, not the status: “Last order”, never “Closed”.</li>
            <li>Times come from <code>lib/format.ts</code> and sit in <code>&lt;time dateTime&gt;</code> with the +08:00 offset.</li>
            <li>No countdowns: the relative “In 3 days” belongs on the departure board, and updates per day.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>“Orders open from March 1st at 9am until the 15th at 9pm, booth on the 17th.”</p>}
          doThis={<p>A timetable with First order, Last order and At the booth.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
