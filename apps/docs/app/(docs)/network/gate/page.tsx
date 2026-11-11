import type { Metadata } from "next"

import { Button } from "@ppitsz/ui/components/button"
import {
  Gate,
  GateActions,
  GateDescription,
  GateHolder,
  GateTitle,
} from "@ppitsz/ui/components/blocks/gate"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { GateSignalDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Gate" }

const SECTIONS = [
  { id: "gate", label: "Gate" },
  { id: "verdicts", label: "Verdicts" },
  { id: "sound", label: "Beep and buzz" },
  { id: "rules", label: "Rules" },
]

export default function GatePage() {
  return (
    <DocPage
      href="/network/gate"
      kicker="Network · gate"
      title="Gate"
      lede="The answer to a scan, read at arm's length like a ticket gate's display: a green arrow through, a check-first, or a red cross. For check-in at the door and handover at the booth."
      sections={SECTIONS}
    >
      <DocSection
        id="gate"
        title="Gate"
        intro={
          <p>
            It replaces the camera until the next scan. The symbol, the title and the color always
            agree, and the title says it in words, so it works for color-blind panitia and in sunlight.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<Gate verdict="go">
  <GateTitle>Checked in</GateTitle>
  <GateHolder name="Malik Ihsan">Regular · Code K7P3QX</GateHolder>
  <GateActions>
    <Button variant="primary" size="lg" onClick={next} autoFocus>Scan next</Button>
    <Button variant="quiet" onClick={undo}>Undo check-in</Button>
  </GateActions>
</Gate>`}
        >
          <Gate verdict="go" className="max-w-xl">
            <GateTitle>Checked in</GateTitle>
            <GateHolder name="Malik Ihsan">Regular · Code K7P3QX</GateHolder>
            <GateActions>
              <Button variant="primary" size="lg">Scan next</Button>
              <Button variant="quiet">Undo check-in</Button>
            </GateActions>
          </Gate>
        </Example>
      </DocSection>

      <DocSection id="verdicts" title="Verdicts">
        <Example lang="en" layout="stack">
          <Gate verdict="hold" className="max-w-xl" aria-live="off">
            <GateTitle>Already checked in</GateTitle>
            <GateHolder name="Malik Ihsan">Regular · Code K7P3QX</GateHolder>
            <GateDescription>
              Checked in at 18:42 by Dimas. If it&apos;s someone else, check their ID.
            </GateDescription>
            <GateActions>
              <Button variant="primary" size="lg">Scan next</Button>
            </GateActions>
          </Gate>
          <Gate verdict="stop" className="max-w-xl" aria-live="off">
            <GateTitle>Not valid today</GateTitle>
            <GateHolder name="Malik Ihsan">Day 2 only · Code M2Q9TA</GateHolder>
            <GateDescription>This ticket is for Sun, Nov 15.</GateDescription>
            <GateActions>
              <Button variant="primary" size="lg">Scan next</Button>
            </GateActions>
          </Gate>
        </Example>
        <SpecTable
          head={["Verdict", "Symbol", "Use for"]}
          rows={[
            ["go", "Arrow up, on success", "Checked in. Order handed over."],
            ["hold", "Exclamation mark, on warning", "Let them through only after a look: already checked in, already picked up, unpaid."],
            ["stop", "Cross, on danger", "Don't let them through: canceled, wrong day, not found."],
          ]}
        />
      </DocSection>

      <DocSection
        id="sound"
        title="Beep and buzz"
        intro={
          <p>
            Like a fare gate, the scanner answers out loud, so staff at a loud door know the verdict before they read it. Each
            verdict has its own rhythm, in sound and in the phone&apos;s buzz (Android; iPhones stay silent to the touch). Sound can
            be turned off per phone with <code>GateSoundToggle</code>; the buzz always comes.
          </p>
        }
      >
        <Example
          title="Try each verdict"
          description="Sound starts after the first tap on the page: browsers allow no sound before that, so the scanner primes it on pointerdown."
          code={`const gate = useGateSignal()

<div onPointerDown={gate.prime}>
  <GateSoundToggle />
  …
</div>

// When the answer comes back:
gate.signal(verdict)`}
        >
          <GateSignalDemo />
        </Example>
        <SpecTable
          head={["Verdict", "Sound", "Buzz"]}
          rows={[
            ["go", "One high beep (1320 Hz, 120ms)", "One short buzz"],
            ["hold", "Two middle beeps (880 Hz)", "Two short buzzes"],
            ["stop", "One low buzzer tone (220 Hz, 450ms)", "One long buzz"],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>It announces itself (<code>role=&quot;status&quot;</code>, <code>aria-live=&quot;assertive&quot;</code>) and focuses “Scan next”, so the door keeps moving.</li>
            <li>The description says what happened and what to do, with the time and who, never a code.</li>
            <li>It fades in once. Nothing flashes or loops. The beep and buzz play once per answer, never on “Scan next”.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A toast for a scan result, or a green check with no words.</p>}
          doThis={<p>The gate, full width, with the verdict as the title and the holder&apos;s name under it.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
