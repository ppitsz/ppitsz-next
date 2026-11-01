import type { Metadata } from "next"

import { Interchange, Route, RouteList, RouteStop, Station } from "@ppitsz/ui/components/network/route"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Route and station" }

const SECTIONS = [
  { id: "station", label: "Stations" },
  { id: "route-list", label: "Route list" },
  { id: "lines", label: "Lines and color" },
  { id: "special", label: "Terminus and transfer" },
  { id: "rules", label: "Rules" },
]

export default function RoutePage() {
  return (
    <DocPage
      href="/network/route"
      kicker="Network · primitives"
      title="Route and station"
      lede="Every network graphic is built from a handful of utilities and one list component. Color comes from --line: brand red by default, or a division set with data-line."
      sections={SECTIONS}
    >
      <DocSection id="station" title="Stations">
        <SpecTable
          head={["Utility / component", "Draws"]}
          rows={[
            [<code key="c">route · route-v</code>, "A horizontal / vertical line in the current --line color"],
            [<code key="c">station</code>, "An upcoming stop: bg fill, ring in the line color"],
            [<code key="c">station-passed</code>, "A passed stop: filled"],
            [<code key="c">station-here</code>, "The current stop: filled, with a static halo"],
            [<code key="c">station-interchange</code>, "A capsule with an ink ring, where lines meet"],
            [<code key="c">route-draw</code>, "Scroll-linked draw-in for routes below the fold"],
            [<code key="c">data-line=&quot;…&quot;</code>, "Sets the line for an element and its descendants"],
          ]}
        />
        <Example code={`<Station />
<Station state="passed" />
<Station state="here" />
<Interchange />`}>
          {(["upcoming", "passed", "here"] as const).map((state) => (
            <span key={state} className="flex flex-col items-center gap-3">
              <Station state={state} />
              <code className="type-caption text-muted">{state}</code>
            </span>
          ))}
          <span className="flex flex-col items-center gap-3">
            <Interchange />
            <code className="type-caption text-muted">interchange</code>
          </span>
        </Example>
      </DocSection>

      <DocSection
        id="route-list"
        title="Route list"
        intro={<p><code>RouteList</code> is an ordered list; each <code>RouteStop</code> draws its station and the segment to the next one, so stops carry their own state, color or terminus. The drawn parts are <code>aria-hidden</code>; the list and its labels carry the meaning.</p>}
      >
        <Example
          layout="block"
          code={`<RouteList>
  <RouteStop state="passed"><span className="type-sign">Online form</span></RouteStop>
  <RouteStop state="here" current="step">
    <span className="type-sign">Interview</span>
    <span className="type-kicker text-accent-text">You are here</span>
  </RouteStop>
  <RouteStop><span className="type-sign text-muted">Results</span></RouteStop>
</RouteList>`}
        >
          <div className="flex flex-col gap-12">
            <RouteList aria-label="Horizontal route example">
              <RouteStop state="passed"><span className="type-sign text-text">Online form</span></RouteStop>
              <RouteStop state="passed"><span className="type-sign text-text">Written test</span></RouteStop>
              <RouteStop state="here" current="step">
                <span className="type-sign text-text">Interview</span>
                <span className="type-kicker text-accent-text">You are here</span>
              </RouteStop>
              <RouteStop><span className="type-sign text-muted">Results</span></RouteStop>
            </RouteList>
            <RouteList orientation="vertical" aria-label="Vertical route example">
              <RouteStop state="passed"><span className="type-sign text-text">Online form</span><span className="type-caption text-muted">Submitted · Sep 12</span></RouteStop>
              <RouteStop state="here" current="step"><span className="type-sign text-text">Interview</span><span className="type-kicker text-accent-text">You are here</span></RouteStop>
              <RouteStop><span className="type-sign text-muted">Results</span><span className="type-caption text-muted">Sep 27</span></RouteStop>
            </RouteList>
          </div>
        </Example>
      </DocSection>

      <DocSection id="lines" title="Lines and color" intro={<p>Set a division on the list or on a single stop. Inside <code>tone-ink</code>, set <code>data-line</code> inside the band so the line takes its dark value.</p>}>
        <Example
          layout="stack"
          code={`<RouteList data-line="humas">…</RouteList>
<Route data-line="sosbud" />`}
        >
          {(["bph", "humas", "medkref", "sosbud"] as const).map((line) => (
            <div key={line} data-line={line} className="flex w-full items-center gap-4">
              <code className="w-20 type-caption text-muted">{line}</code>
              <span className="relative flex flex-1 items-center">
                <Route className="absolute inset-x-0" />
                <Station state="passed" />
                <span className="flex-1" />
                <Station state="here" />
                <span className="flex-1" />
                <Station />
              </span>
            </div>
          ))}
        </Example>
      </DocSection>

      <DocSection id="special" title="Terminus and transfer" intro={<p>A route can stop at a station with a danger terminus bar, gray out what it no longer reaches, or continue a short way onto another line.</p>}>
        <Example
          layout="block"
          code={`<RouteStop state="here" end terminus>…</RouteStop>
<RouteStop dim>…</RouteStop>
<RouteStop state="here" extend="humas">…</RouteStop>`}
        >
          <div className="flex flex-col gap-12">
            <RouteList>
              <RouteStop state="passed"><span className="type-sign text-text">Form</span></RouteStop>
              <RouteStop state="here" end terminus><span className="type-sign text-text">Interview</span></RouteStop>
              <RouteStop dim><span className="type-sign text-muted">Results</span></RouteStop>
            </RouteList>
            <RouteList className="pe-16">
              <RouteStop state="passed"><span className="type-sign text-text">Form</span></RouteStop>
              <RouteStop state="passed"><span className="type-sign text-text">Interview</span></RouteStop>
              <RouteStop state="here" extend="humas"><span className="type-sign text-text">Results</span></RouteStop>
            </RouteList>
          </div>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>A station always has a visible label. The current station is also marked in text (“You are here”) or with <code>aria-current</code>.</li>
            <li>Routes run horizontally or vertically, bends at 45° only; labels sit below horizontal routes and right of vertical ones.</li>
            <li>Line weight and station size come from the utilities; don&apos;t restyle them per page.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A network drawing behind a heading, or lines that connect nothing.</p>}
          doThis={<p>Every route has labeled stations that are real campuses, sections, stages or events.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
