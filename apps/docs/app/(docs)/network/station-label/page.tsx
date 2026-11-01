import type { Metadata } from "next"

import { CampusLabel, StationLabel } from "@ppitsz/ui/components/network/station-label"
import { CAMPUSES } from "@ppitsz/ui/lib/network"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Station label" }

const SECTIONS = [
  { id: "campuses", label: "Campuses" },
  { id: "venues", label: "Venues" },
  { id: "rules", label: "Rules" },
]

export default function StationLabelPage() {
  return (
    <DocPage
      href="/network/station-label"
      kicker="Network · station-label"
      title="Station label"
      lede="The Latin or Indonesian name in type-sign, with the Chinese name on the line below, as on Shenzhen Metro signs."
      sections={SECTIONS}
    >
      <DocSection id="campuses" title="Campuses" intro={<p>Six stations, in data order, roughly west to east.</p>}>
        <Example code={`<CampusLabel campus="cuhksz" />`}>
          {CAMPUSES.map((c) => (
            <CampusLabel key={c.id} campus={c.id} />
          ))}
        </Example>
        <SpecTable
          head={["id", "Station", "中文", "Full name"]}
          rows={CAMPUSES.map((c) => [
            <code key="i">{c.id}</code>,
            c.name,
            <span key="z" lang="zh-Hans">{c.zh}</span>,
            c.fullName,
          ])}
        />
      </DocSection>

      <DocSection id="venues" title="Venues" intro={<p>Any place can be a station. Venues without a Chinese name show the Latin line only.</p>}>
        <Example code={`<StationLabel name="Konsulat Jenderal RI Guangzhou" zh="印度尼西亚驻广州总领事馆" />`}>
          <StationLabel name="Konsulat Jenderal RI Guangzhou" zh="印度尼西亚驻广州总领事馆" />
          <StationLabel name="Sports hall" />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>The Chinese line carries <code>lang=&quot;zh-Hans&quot;</code>, so it switches to Noto Sans SC automatically.</li>
            <li>Never mix the two languages in one line.</li>
            <li>Chinese names are written or reviewed by a fluent speaker.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
