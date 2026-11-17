import Link from "next/link"

import { Link as TextLink } from "@ppitsz/ui/components/link"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { CampusLine } from "@ppitsz/ui/components/network/campus-line"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { CodeBlock } from "@/components/docs/code-block"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DOCS_GROUPS } from "@/lib/nav"
import { CAMPUS_COUNTS } from "@/lib/sample-data"

const SECTIONS = [
  { id: "idea", label: "The idea" },
  { id: "principles", label: "Principles" },
  { id: "carries-over", label: "What carries over" },
  { id: "using", label: "Using Jaringan" },
  { id: "map", label: "The map" },
]

const PRINCIPLES = [
  {
    name: "Satu jaringan",
    en: "One network",
    body: "Show how things connect: who runs an event, where it happens, how far along a process is.",
    does: "Every event row shows its division's line badge and its campus station; a recruitment application is a route with the applicant's stop marked.",
    doesnt: "Decorative metro maps, or lines and dots that connect nothing.",
  },
  {
    name: "Petunjuk, bukan hiasan",
    en: "Wayfinding, not decoration",
    body: "Every screen tells the reader where they are, what comes next and where they can go.",
    does: "Clear current-page markers, a route strip on long pages, “You are here” on timelines.",
    doesnt: "Ornament of any kind. The network graphics are the only decoration, and they carry information.",
  },
  {
    name: "Merah adalah jalur utama",
    en: "Red is the main line",
    body: "Red marks the brand and the one action to take. Division colors exist only inside network graphics.",
    does: "One red button per screen; the eight line colors only on badges, routes and stations.",
    doesnt: "Colored section backgrounds, colored headings, rainbow layouts, gradients.",
  },
  {
    name: "Orang di setiap stasiun",
    en: "People at every station",
    body: "The network is the structure; members are the content. Real photos of real people lead every page.",
    does: "The home page pairs the campus network with a large, natural-color group photo.",
    doesnt: "Stock photos, 3D renders, illustrations of people, darkened photos with text on them.",
  },
  {
    name: "Bahasa yang jelas",
    en: "Plain English, Indonesian where it belongs",
    body: "The interface speaks plain English. Indonesian stays for proper names and the organization's own prose. It says \"we\": one organization, not its divisions (ADR 0007, ADR 0012).",
    does: "English buttons, statuses and emails; division names in Indonesian, marked lang=\"id\"; station labels still stack the Chinese name under the Latin one.",
    doesnt: "Insider words like panitia or kasir, \"Danus checks…\" where \"we check\" will do, or a language switcher that doubles every string.",
  },
]

export default function OverviewPage() {
  return (
    <DocPage
      href="/"
      kicker="PPIT Shenzhen design system"
      title="Jaringan"
      lede="The design system for every PPIT Shenzhen website. It shows campuses, divisions and events the way the Shenzhen Metro shows lines and stations, and it is built on shadcn/ui."
      sections={SECTIONS}
    >
      <CampusLine campuses={CAMPUS_COUNTS} className="-mt-4" />

      <DocSection
        id="idea"
        title="The idea"
        intro={
          <>
            <p>
              Members travel between campuses on the Shenzhen Metro, so the system borrows its
              visual language: lines, stations, interchanges and departure boards. They show who
              runs something, where it happens, what comes next and how far along a process is.
            </p>
            <p>
              The metro stays in the graphics, not the words. Copy is plain (“Upcoming events”,
              not “All aboard for adventure!”). There are no fake tickets, LED fonts or train
              sounds, and every line and station on screen carries information.
            </p>
          </>
        }
      >
        <SpecTable
          head={["Network term", "What it represents"]}
          rows={[
            [
              <strong key="l">Line</strong>,
              <span key="r" className="flex flex-col gap-2">
                <span>
                  A division, with a permanent color and a line badge. The brand red line is
                  PPITSZ itself.
                </span>
                <span className="flex flex-wrap gap-2">
                  <LineBadge code="humas" />
                  <LineBadge code="pka" />
                  <LineBadge code="medkref" />
                </span>
              </span>,
            ],
            [<strong key="l">Station</strong>, "A campus or an event venue."],
            [<strong key="l">Interchange</strong>, "Where lines meet: a joint event, or a campus served by many divisions."],
            [<strong key="l">Route</strong>, "Any sequence: the recruitment stages, the year's events, the sections of a long page."],
            [<strong key="l">“You are here”</strong>, "Today's position on a timeline, or the applicant's current recruitment stage."],
            [<strong key="l">Departure board</strong>, "The list of upcoming events."],
          ]}
        />
      </DocSection>

      <DocSection id="principles" title="Principles">
        <ol className="flex flex-col border-t">
          {PRINCIPLES.map((p, i) => (
            <li key={p.name} className="grid gap-4 border-b py-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
              <div className="flex flex-col gap-1">
                <span className="type-kicker text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 lang="id" className="type-heading-lg text-text">{p.name}</h3>
                <p className="type-ui text-muted">{p.en}</p>
              </div>
              <div className="flex flex-col gap-3 type-body-sm text-text">
                <p className="type-body">{p.body}</p>
                <p><span className="type-ui">This means: </span>{p.does}</p>
                <p className="text-muted"><span className="type-ui text-text">This doesn't mean: </span>{p.doesnt}</p>
              </div>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection
        id="carries-over"
        title="What carries over"
        intro={
          <>
            <p>Three things carry over from the old site:</p>
            <ul>
              <li>the official PPI Tiongkok Cabang Shenzhen mark;</li>
              <li>the color red, refreshed into a brighter signal red and used sparingly;</li>
              <li>the people, through real photography.</li>
            </ul>
            <p>
              Maroon backgrounds, gold, the newspaper theme, batik wallpaper, serif headlines and
              the old components are retired. People should recognize the site as PPITSZ from its
              logo, its red and its members. Everything else is new.
            </p>
          </>
        }
      />

      <DocSection
        id="using"
        title="Using Jaringan"
        intro={
          <>
            <p>
              The system lives in the <code>ppitsz/</code> monorepo as the{" "}
              <code>@ppitsz/ui</code> package. Every PPITSZ site is an app in{" "}
              <code>apps/</code> that imports its stylesheet and components.
            </p>
            <p>
              Components start from <TextLink href="https://ui.shadcn.com">shadcn/ui</TextLink> on Base
              UI, then get a restyle pass: semantic tokens only, one <code>type-*</code> class for
              text, capsules for anything pressable. New shadcn components go through the same pass
              (the mapping table is in <code>packages/ui/README.md</code>).
            </p>
          </>
        }
      >
        <CodeBlock
          code={`// app/layout.tsx
import "@ppitsz/ui/globals.css"

// any page
import { Button } from "@ppitsz/ui/components/button"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { DepartureBoard, DepartureRow } from "@ppitsz/ui/components/blocks/departure-board"`}
        />
        <CodeBlock
          lang="bash"
          code={`# add a shadcn component (lands in packages/ui), then restyle it
cd apps/docs && bunx shadcn@latest add tooltip

# before finishing any change
bun run guardrails && bun run typecheck && bun run build`}
        />
      </DocSection>

      <DocSection id="map" title="The map" intro={<p>The sections of these docs, drawn as a route.</p>}>
        <RouteList orientation="vertical" className="md:hidden">
          {DOCS_GROUPS.map((group) => (
            <RouteStop key={group.id} state="passed">
              <Link href={group.href} className="-mt-1 type-heading-md text-text underline-offset-4 hover:underline">
                {group.title}
              </Link>
              <span className="type-body-sm text-muted">{group.description}</span>
            </RouteStop>
          ))}
        </RouteList>
        <RouteList orientation="horizontal" className="hidden md:flex">
          {DOCS_GROUPS.map((group) => (
            <RouteStop key={group.id} state="passed" draw>
              <Link href={group.href} className="type-heading-md text-text underline-offset-4 hover:underline">
                {group.title}
              </Link>
              <span className="type-body-sm text-muted">{group.pages.length} pages</span>
            </RouteStop>
          ))}
        </RouteList>
      </DocSection>
    </DocPage>
  )
}
