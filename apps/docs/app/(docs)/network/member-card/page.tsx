import type { Metadata } from "next"

import { MemberCard, MemberLead, MemberList } from "@ppitsz/ui/components/blocks/member-card"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { Route } from "@ppitsz/ui/components/network/route"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { HUMAS_MEMBERS, LEADS } from "@/lib/sample-data"

export const metadata: Metadata = { title: "Member card" }

const SECTIONS = [
  { id: "lead", label: "Lead" },
  { id: "line", label: "A division line" },
  { id: "list", label: "List" },
  { id: "rules", label: "Rules" },
]

export default function MemberCardPage() {
  return (
    <DocPage
      href="/network/member-card"
      kicker="Network · member-card"
      title="Member card"
      lede="Kepengurusan is laid out as the network's lines: each division is a section with its badge, a route in its color, then its people. Portraits are raw photos; names, roles and campuses are live text."
      sections={SECTIONS}
    >
      <DocSection id="lead" title="Lead" intro={<p>For BPH&apos;s Ketua and Wakil: a larger portrait beside the name in type-display-lg, the role, campus and a short quote. Without a photo, the portrait shows initials. Names and quotes are illustrative.</p>}>
        <Example layout="block" code={`<MemberLead member={ketua} media={<Image src={ketua.photo} alt="" … />} />`}>
          <MemberLead member={LEADS[0]!} />
        </Example>
      </DocSection>

      <DocSection id="line" title="A division line" intro={<p>The L4 section: header with line badge, full name and one-sentence purpose, a route in the division color, then a grid of 2 to 4 columns. Each card&apos;s tiny station is the division color; its label is the campus.</p>}>
        <Example
          layout="block"
          code={`<section data-line="humas" aria-labelledby="humas">
  <LineBadge code="humas" />
  <h2 id="humas">Hubungan Masyarakat</h2>
  <Route />
  <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
    {members.map((m) => <MemberCard key={m.name} member={m} media={…} />)}
  </div>
</section>`}
        >
          <section data-line="humas" aria-labelledby="mc-humas" className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <LineBadge code="humas" className="self-start" />
              <h2 id="mc-humas" className="type-display-lg text-text">Hubungan Masyarakat</h2>
              <p lang="id" className="max-w-[60ch] type-body text-muted">Menjaga hubungan dengan kampus, KJRI dan mitra, dan memastikan kabar sampai ke semua anggota.</p>
            </div>
            <Route />
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
              {HUMAS_MEMBERS.map((member) => (
                <MemberCard key={member.name} member={member} />
              ))}
            </div>
          </section>
        </Example>
      </DocSection>

      <DocSection id="list" title="List" intro={<p>Text-only rows for large divisions or past cabinets.</p>}>
        <Example layout="block" code={`<MemberList members={members} />`}>
          <MemberList members={HUMAS_MEMBERS.slice(0, 4)} />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Order: head, then deputy, then staff alphabetically. Divisions: BPH, then DANUS, DEPOL, HUMAS, IT, MEDKREF, PKA, SOSBUD.</li>
            <li>The name is an <code>h3</code> under the division&apos;s <code>h2</code>. Photos use <code>alt=&quot;&quot;</code> because the name follows.</li>
            <li>Not clickable. The optional Instagram icon button is labeled “Instagram {"{Name}"}”.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>Committee posters with name and position typeset into the image.</p>}
          doThis={<p>Raw 4:5 portraits, with name, role, campus and line as HTML.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
