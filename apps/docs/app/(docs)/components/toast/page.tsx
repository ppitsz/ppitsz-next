import type { Metadata } from "next"

import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"
import { ToastDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Toast" }

const SECTIONS = [
  { id: "demo", label: "Demo" },
  { id: "timing", label: "Timing" },
  { id: "rules", label: "Rules" },
]

export default function ToastPage() {
  return (
    <DocPage
      href="/components/toast"
      kicker="Components · shadcn sonner"
      title="Toast"
      lede="Toasts confirm things that already happened: “Form sent”. They float bottom-right (bottom-center on phones), carry a status edge and icon, and never take focus."
      sections={SECTIONS}
    >
      <DocSection
        id="demo"
        title="Demo"
        intro={<p>Render <code>&lt;Toaster /&gt;</code> once in the root layout, then call <code>notify</code>. Sonner runs unstyled and every class is a token, so toasts follow the theme on their own.</p>}
      >
        <Example
          code={`import { notify } from "@ppitsz/ui/components/sonner"

notify.success("Form sent", { description: "We'll let you know by email." })
notify.danger("Upload failed", { description: "The file is larger than 10 MB." })`}
        >
          <ToastDemo />
        </Example>
      </DocSection>

      <DocSection id="timing" title="Timing" intro={<p><code>notify</code> builds these rules in, so call sites can&apos;t get them wrong.</p>}>
        <SpecTable
          head={["Tone", "Dismisses", "With an action"]}
          rows={[
            ["success, info", "After 5 seconds", "After 8 seconds"],
            ["warning, danger", "Stays until closed", "Stays until closed"],
          ]}
        />
        <Prose>
          <p>The timer pauses on hover and focus. At most three are visible.</p>
        </Prose>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Blocking errors go inline, next to the problem, not in a toast.</li>
            <li>A toast&apos;s action must also be reachable elsewhere on the page.</li>
            <li>Never move focus to a toast.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
