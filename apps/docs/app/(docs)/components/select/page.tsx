import type { Metadata } from "next"

import { Field, FieldDescription, FieldLabel } from "@ppitsz/ui/components/field"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { CAMPUSES } from "@ppitsz/ui/lib/network"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Select" }

const SECTIONS = [
  { id: "native", label: "Native select" },
  { id: "states", label: "States" },
  { id: "rules", label: "Rules" },
]

export default function SelectPage() {
  return (
    <DocPage
      href="/components/select"
      kicker="Components · shadcn native-select"
      title="Select"
      lede="Always native. The browser's own picker gives the right keyboard, screen-reader and phone behavior, and follows the color scheme in dark mode. shadcn ships this as NativeSelect."
      sections={SECTIONS}
    >
      <DocSection id="native" title="Native select" intro={<p>Same anatomy as an input, with a <code>CaretDown</code>. The first option is an empty prompt. Campus options carry the bilingual name.</p>}>
        <Example
          layout="block"
          code={`<NativeSelect id="campus" required defaultValue="">
  <NativeSelectOption value="" disabled>Choose a campus</NativeSelectOption>
  <NativeSelectOption value="cuhksz">CUHK-Shenzhen 香港中文大学（深圳）</NativeSelectOption>
</NativeSelect>`}
        >
          <Field className="max-w-md">
            <FieldLabel htmlFor="sel-campus">Campus</FieldLabel>
            <NativeSelect id="sel-campus" defaultValue="">
              <NativeSelectOption value="" disabled>Choose a campus</NativeSelectOption>
              {CAMPUSES.map((campus) => (
                <NativeSelectOption key={campus.id} value={campus.id}>
                  {campus.name} {campus.zh}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </Example>
      </DocSection>

      <DocSection id="states" title="States" intro={<p>Identical to Input. While options load, it shows as disabled with “Loading…”.</p>}>
        <Example layout="block" code={`<NativeSelect disabled><NativeSelectOption>Loading…</NativeSelectOption></NativeSelect>
<NativeSelect size="sm">…</NativeSelect>`}>
          <div className="grid w-full max-w-2xl gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sel-slot">Interview slot</FieldLabel>
              <NativeSelect id="sel-slot" disabled aria-describedby="sel-slot-help">
                <NativeSelectOption>Loading…</NativeSelectOption>
              </NativeSelect>
              <FieldDescription id="sel-slot-help">Slots appear once the written test is graded.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="sel-urut">Urutkan</FieldLabel>
              <NativeSelect id="sel-urut" size="sm" defaultValue="terbaru">
                <NativeSelectOption value="terbaru">Terbaru</NativeSelectOption>
                <NativeSelectOption value="terdekat">Terdekat</NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Multi-select is a checkbox group instead.</li>
            <li>A searchable custom listbox is allowed only in admin, following the WAI-ARIA combobox pattern (shadcn <code>combobox</code>).</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
