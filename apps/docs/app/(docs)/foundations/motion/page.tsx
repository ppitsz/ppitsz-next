import type { Metadata } from "next"

import { Button } from "@ppitsz/ui/components/button"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { EnterDemo, StationStateDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Motion" }

const SECTIONS = [
  { id: "tokens", label: "Tokens" },
  { id: "moves", label: "What moves" },
  { id: "never", label: "What never moves" },
  { id: "reduced", label: "Reduced motion" },
]

export default function MotionPage() {
  return (
    <DocPage
      href="/foundations/motion"
      kicker="Foundations"
      title="Motion"
      lede="Motion shows movement through the network or a change of state. Nothing moves for decoration or loops, and reduced motion turns it off."
      sections={SECTIONS}
    >
      <DocSection id="tokens" title="Tokens">
        <SpecTable
          head={["Token", "Value", "Use"]}
          rows={[
            [<code key="t">--duration-fast</code>, "120ms", "Hover and press color changes"],
            [<code key="t">--duration-base</code>, "200ms", "Dialogs, popovers, menus, accordion, station state changes"],
            [<code key="t">--duration-slow</code>, "320ms", "Toasts"],
            [<code key="t">ease-out</code>, "cubic-bezier(0.22, 1, 0.36, 1)", "Entering and responding (default)"],
            [<code key="t">ease-in</code>, "cubic-bezier(0.55, 0, 1, 0.45)", "Leaving"],
            [<code key="t">ease-in-out</code>, "cubic-bezier(0.65, 0, 0.35, 1)", "Moving on screen"],
            [<code key="t">animate-enter</code>, "fade + 8px rise, 200ms", "Floating layers opening"],
            [<code key="t">animate-spin</code>, "800ms rotation", "Spinners while loading"],
          ]}
        />
      </DocSection>

      <DocSection id="moves" title="What moves">
        <Example title="Color change on hover and press" description="120ms, ease-out. The primary button also presses down 1px." code={`<Button variant="primary">Register</Button>`}>
          <Button variant="primary">Register</Button>
          <Button>See schedule</Button>
          <Button variant="quiet">Cancel</Button>
        </Example>
        <Example title="Floating layers enter" description="Dialogs, popovers and menus fade and rise 8px over 200ms. Closing is instant." code={`<div className="animate-enter">…</div>`}>
          <EnterDemo />
        </Example>
        <Example title="Station state changes" description="A station fills over 200ms when its section is reached." code={`<Station state="here" />`}>
          <StationStateDemo />
        </Example>
        <Example
          title="Routes below the fold draw as you scroll"
          description="route-draw is scroll-linked and CSS-only (animation-timeline: view()). Where unsupported, or under reduced motion, the route is simply drawn. Never on a route above the fold."
          layout="block"
          code={`<RouteStop draw>…</RouteStop>   // or <Route draw />`}
        >
          <RouteList>
            {["Form", "Test", "Interview", "Results"].map((label) => (
              <RouteStop key={label} state="passed" draw>
                <span className="type-sign text-text">{label}</span>
              </RouteStop>
            ))}
          </RouteList>
        </Example>
      </DocSection>

      <DocSection id="never" title="What never moves">
        <Prose>
          <ul>
            <li>Text: no typewriter effects, word-by-word reveals or rotating words.</li>
            <li>Numbers: no count-up stats, no ticking countdowns. “In 12 days” updates per day.</li>
            <li>No split-flap boards, moving trains or animated dashes along routes.</li>
            <li>No infinite or ambient animation: no pulse on “you are here”, no shimmer skeletons, no bounce. A station halo is static.</li>
            <li>No parallax, scroll-jacking, auto-advancing carousels or hover scaling.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A pulsing “you are here”, count-up stats, split-flap boards, hover scaling, auto carousels.</p>}
          doThis={<p>Routes that draw as you scroll below the fold, a static halo, 120ms color transitions, and nothing at all under reduced motion.</p>}
        />
      </DocSection>

      <DocSection
        id="reduced"
        title="Reduced motion"
        intro={
          <p>
            Under <code>prefers-reduced-motion: reduce</code>, a global rule cuts every animation and
            transition to 1ms. <code>route-draw</code> never runs, so routes are simply drawn.
            Spinners stop and the loading label (“Sending…”) carries the state. Station state
            changes happen instantly.
          </p>
        }
      />
    </DocPage>
  )
}
