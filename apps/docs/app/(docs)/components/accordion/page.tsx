import type { Metadata } from "next"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ppitsz/ui/components/accordion"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Accordion" }

const SECTIONS = [
  { id: "faq", label: "FAQ" },
  { id: "rules", label: "Rules" },
]

const FAQ = [
  ["Who can become a member of PPIT Shenzhen?", "Every Indonesian student studying in Shenzhen, at any campus and any level."],
  ["Is there a membership fee?", "No. Some events have a registration fee, and the amount is always on the event's page."],
  ["How do I apply to join the committee?", "Recruitment opens every September. Watch our Forms page and Instagram."],
]

export default function AccordionPage() {
  return (
    <DocPage
      href="/components/accordion"
      kicker="Components · shadcn accordion"
      title="Accordion"
      lede="The FAQ pattern: rows separated by hairlines, the question in type-heading-md with a rotating caret, the answer in muted body text at most 66ch wide."
      sections={SECTIONS}
    >
      <DocSection id="faq" title="FAQ">
        <Example
          layout="block"
          code={`<Accordion>
  <AccordionItem value="members">
    <AccordionTrigger>Who can become a member?</AccordionTrigger>
    <AccordionContent>…</AccordionContent>
  </AccordionItem>
</Accordion>`}
        >
          <Accordion>
            {FAQ.map(([q, a], i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>
                  <p>{a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Height animates over 200ms where supported; under reduced motion it opens instantly.</li>
            <li>The FAQ page uses the narrow column, with category filter chips above the accordion.</li>
            <li>Questions are written the way people ask them, in the page language.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
