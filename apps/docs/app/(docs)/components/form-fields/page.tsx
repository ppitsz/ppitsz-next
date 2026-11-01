import type { Metadata } from "next"

import { Checkbox } from "@ppitsz/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@ppitsz/ui/components/radio-group"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { FormErrorDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Form fields" }

const SECTIONS = [
  { id: "anatomy", label: "Anatomy" },
  { id: "states", label: "States" },
  { id: "choices", label: "Checkbox and radio" },
  { id: "errors", label: "Error summary" },
  { id: "rules", label: "Rules" },
]

export default function FormFieldsPage() {
  return (
    <DocPage
      href="/components/form-fields"
      kicker="Components · shadcn field, input, textarea, checkbox, radio-group"
      title="Form fields"
      lede="Label, optional marker, control, helper, error. Labels are always visible, optional fields are marked instead of required ones, and every error says how to fix it."
      sections={SECTIONS}
    >
      <DocSection id="anatomy" title="Anatomy">
        <Example
          layout="block"
          code={`<Field>
  <FieldLabel htmlFor="nickname" optional>Nickname</FieldLabel>
  <Input id="nickname" autoComplete="nickname" aria-describedby="nickname-help" />
  <FieldDescription id="nickname-help">Used on your member card.</FieldDescription>
</Field>`}
        >
          <FieldGroup className="max-w-md">
            <Field>
              <FieldLabel htmlFor="ff-full-name">Full name</FieldLabel>
              <Input id="ff-full-name" autoComplete="name" placeholder="As on your passport" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ff-nickname" optional>Nickname</FieldLabel>
              <Input id="ff-nickname" autoComplete="nickname" aria-describedby="ff-nickname-help" />
              <FieldDescription id="ff-nickname-help">Used on your member card.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ff-motivation">Why do you want to join?</FieldLabel>
              <Textarea id="ff-motivation" aria-describedby="ff-motivation-help" />
              <FieldDescription id="ff-motivation-help">Two or three sentences are enough.</FieldDescription>
            </Field>
          </FieldGroup>
        </Example>
      </DocSection>

      <DocSection id="states" title="States">
        <SpecTable
          head={["State", "Behavior"]}
          rows={[
            ["Hover", "The border darkens to text."],
            ["Focus-visible", "The global outline."],
            ["Invalid", "aria-invalid: the border turns danger and thickens without shifting layout; the error message appears."],
            ["Disabled", "surface fill, subtle text."],
            ["Read-only", "surface fill, normal text."],
            ["Loading", "Async validation (checking a student ID): a small spinner in the field, aria-busy."],
          ]}
        />
        <Example
          layout="block"
          code={`<Input aria-invalid aria-describedby="nim-error" />
<FieldError id="nim-error">Enter your 9-digit student ID without spaces.</FieldError>`}
        >
          <FieldGroup className="max-w-md">
            <Field data-invalid>
              <FieldLabel htmlFor="ff-nim">NIM</FieldLabel>
              <Input id="ff-nim" defaultValue="12345 678" aria-invalid aria-describedby="ff-nim-error" inputMode="numeric" />
              <FieldError id="ff-nim-error">Enter your 9-digit student ID without spaces.</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="ff-campus">Campus</FieldLabel>
              <Input id="ff-campus" defaultValue="CUHK-Shenzhen" readOnly />
            </Field>
            <Field data-disabled="true">
              <FieldLabel htmlFor="ff-intake">Angkatan</FieldLabel>
              <Input id="ff-intake" defaultValue="2026" disabled aria-describedby="ff-intake-help" />
              <FieldDescription id="ff-intake-help">Filled in from your registration.</FieldDescription>
            </Field>
          </FieldGroup>
        </Example>
      </DocSection>

      <DocSection
        id="choices"
        title="Checkbox and radio"
        intro={<p>Base UI controls that fill with the accent when checked, each in a full-row label at least 44px tall. Groups use <code>&lt;fieldset&gt;</code> and <code>&lt;legend&gt;</code>. Multi-select is a checkbox group, never a multi-select dropdown.</p>}
      >
        <Example
          layout="block"
          code={`<FieldSet>
  <FieldLegend>Preferred division</FieldLegend>
  <RadioGroup defaultValue="humas">
    <Field orientation="horizontal">
      <RadioGroupItem value="humas" id="humas" />
      <FieldLabel htmlFor="humas">Hubungan Masyarakat</FieldLabel>
    </Field>
  </RadioGroup>
</FieldSet>`}
        >
          <div className="grid gap-10 md:grid-cols-2">
            <FieldSet>
              <FieldLegend>Preferred division</FieldLegend>
              <RadioGroup defaultValue="humas">
                {[
                  ["humas", "Hubungan Masyarakat"],
                  ["medkref", "Media Kreatif"],
                  ["pka", "Perkembangan Karir dan Akademik"],
                ].map(([value, label]) => (
                  <Field key={value} orientation="horizontal">
                    <RadioGroupItem value={value!} id={`ff-r-${value}`} />
                    <FieldLabel htmlFor={`ff-r-${value}`}>{label}</FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
            </FieldSet>
            <FieldSet>
              <FieldLegend>What you're bringing</FieldLegend>
              <FieldGroup data-slot="checkbox-group" className="gap-1">
                <Field orientation="horizontal">
                  <Checkbox id="ff-c-ktm" defaultChecked />
                  <FieldLabel htmlFor="ff-c-ktm">Kartu mahasiswa</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="ff-c-paspor" />
                  <FieldContent>
                    <FieldLabel htmlFor="ff-c-paspor">Paspor</FieldLabel>
                    <FieldDescription>Only for off-campus events.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal" data-disabled="true">
                  <Checkbox id="ff-c-x" disabled />
                  <FieldLabel htmlFor="ff-c-x">Ticket (handed out at the venue)</FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        </Example>
      </DocSection>

      <DocSection
        id="errors"
        title="Error summary"
        intro={<p>Validate on blur and on submit, never per keystroke. A failed submit shows a summary at the top (<code>role=&quot;alert&quot;</code>) with links to each field, and moves focus to it. Try submitting the form empty.</p>}
      >
        <Example layout="block" code={`<Alert variant="danger" live>
  <AlertTitle>Check these 2 answers</AlertTitle>
  <AlertDescription><ul><li><a href="#nim">Enter your 9-digit student ID without spaces.</a></li></ul></AlertDescription>
</Alert>`}>
          <FormErrorDemo />
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Placeholders show example formats only, never instructions.</li>
            <li>Use <code>autoComplete</code> and <code>inputMode</code>. Input text is at least 16px so iOS doesn&apos;t zoom.</li>
            <li><code>&lt;label for&gt;</code> on every control; <code>aria-describedby</code> pointing at the helper and error ids that exist.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>Placeholders as labels, a disabled submit until the form is valid, “Invalid input”.</p>}
          doThis={<p>Visible labels, “(optional)” markers, an error summary plus inline fixes: “Enter your campus email ending in .edu.cn”.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
