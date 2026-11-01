import type { Metadata } from "next"
import { ArrowRightIcon, DownloadSimpleIcon, TrashIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react/ssr"

import { Button } from "@ppitsz/ui/components/button"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { LoadingButtonDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Button" }

const SECTIONS = [
  { id: "variants", label: "Variants" },
  { id: "sizes", label: "Sizes" },
  { id: "states", label: "States" },
  { id: "icons", label: "With icons" },
  { id: "rules", label: "Rules" },
]

export default function ButtonPage() {
  return (
    <DocPage
      href="/components/button"
      kicker="Components · shadcn button"
      title="Button"
      lede="A capsule, for anything you press. Red marks the one action to take on a screen, so primary is never the default."
      sections={SECTIONS}
    >
      <DocSection
        id="variants"
        title="Variants"
        intro={
          <p>
            <strong>Primary</strong> is the accent fill, once per screen. <strong>Secondary</strong>{" "}
            (the default) is a text-colored outline. <strong>Quiet</strong> is text only, for
            toolbars and icon buttons. <strong>Danger</strong> is an outlined tint with a leading{" "}
            <code>WarningCircle</code>. It is never a solid red fill and never sits beside a primary.
          </p>
        }
      >
        <Example
          code={`<Button variant="primary">Register now</Button>
<Button>See schedule</Button>
<Button variant="quiet">Cancel</Button>
<Button variant="danger"><WarningCircleIcon aria-hidden />Reject applicant</Button>`}
        >
          <Button variant="primary">Register now</Button>
          <Button>See schedule</Button>
          <Button variant="quiet">Cancel</Button>
        </Example>
        <Example code={`<Button variant="danger"><WarningCircleIcon aria-hidden />Reject applicant</Button>`}>
          <Button variant="quiet">Cancel</Button>
          <Button variant="danger">
            <WarningCircleIcon aria-hidden />
            Reject applicant
          </Button>
        </Example>
      </DocSection>

      <DocSection id="sizes" title="Sizes" intro={<p>Small for toolbars, chip rows and admin; medium (44px) by default; large for the hero only.</p>}>
        <Example code={`<Button size="sm">Download</Button>
<Button>Download</Button>
<Button size="lg" variant="primary">Register now</Button>`}>
          <Button size="sm">Download</Button>
          <Button>Download</Button>
          <Button size="lg" variant="primary">Register now</Button>
        </Example>
      </DocSection>

      <DocSection id="states" title="States">
        <SpecTable
          head={["State", "Behavior"]}
          rows={[
            ["Hover", "accent-hover (primary) or a surface-strong fill (others), 120ms. Pointer devices only."],
            ["Active", "accent-active (primary), plus a 1px downward press."],
            ["Focus-visible", "The global 2px focus outline with an offset."],
            ["Disabled", "surface fill, subtle text, no hover. Explain why nearby. Never disable submit to signal an invalid form."],
            ["Loading", "Spinner + progressive label (“Send” → “Sending…”), aria-busy. Presses are ignored and focus stays put."],
          ]}
        />
        <Example
          title="Loading"
          description="Press it. The button keeps focus, ignores repeat presses and announces the new label."
          code={`<Button variant="primary" loading={sending}>
  {sending ? "Sending…" : "Send"}
</Button>`}
        >
          <LoadingButtonDemo />
        </Example>
        <Example title="Disabled" code={`<Button disabled>Closed</Button>`}>
          <Button disabled>Closed</Button>
          <span className="type-caption text-muted">Registration closed September 30.</span>
        </Example>
      </DocSection>

      <DocSection id="icons" title="With icons" intro={<p>An optional leading icon; a trailing <code>ArrowRight</code> only for “go to” actions. Icon-only buttons take an <code>aria-label</code> in the page language and keep a 44px hit area.</p>}>
        <Example code={`<Button variant="primary">See all events <ArrowRightIcon aria-hidden /></Button>
<Button><DownloadSimpleIcon aria-hidden />Download the guide</Button>
<Button variant="quiet" size="icon" aria-label="Delete"><TrashIcon aria-hidden /></Button>`}>
          <Button variant="primary">
            See all events
            <ArrowRightIcon aria-hidden />
          </Button>
          <Button>
            <DownloadSimpleIcon aria-hidden />
            Download the guide
          </Button>
          <Button variant="quiet" size="icon" aria-label="Delete">
            <TrashIcon aria-hidden />
          </Button>
          <Button variant="quiet" size="icon" aria-label="Close">
            <XIcon aria-hidden />
          </Button>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <DoDont
          dont={<p>Two red buttons on one screen, such as “Register” and “Send” side by side.</p>}
          doThis={<p>One primary per screen; everything else secondary or quiet.</p>}
        />
        <Prose>
          <ul>
            <li><code>&lt;button&gt;</code> for actions, links for navigation, never a clickable <code>&lt;div&gt;</code>. To render a link that looks like a button: <code>{`<Button nativeButton={false} render={<Link href="/events" />}>`}</code>.</li>
            <li>Toggles use <code>aria-pressed</code> (see Toggle and filter chips).</li>
            <li>Short verbs: “Register”, “Send”, “View gallery”. Never “Click here”.</li>
            <li>Inside <code>tone-ink</code> the same tokens render correctly with no extra code.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
