import type { Metadata } from "next"
import Link from "next/link"

import { Link as TextLink } from "@ppitsz/ui/components/link"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Layout" }

const SECTIONS = [
  { id: "grid", label: "Grid" },
  { id: "width", label: "Content width" },
  { id: "layouts", label: "Signature layouts" },
  { id: "pages", label: "Page compositions" },
]

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <TextLink as={Link} href={href}>
      {children}
    </TextLink>
  )
}

export default function LayoutPage() {
  return (
    <DocPage
      href="/foundations/layout"
      kicker="Foundations"
      title="Layout"
      lede="Text is left-aligned. Content sits in a centered column, station screens and photos run full-bleed, and seven layouts recur across the site."
      sections={SECTIONS}
    >
      <DocSection
        id="grid"
        title="Grid"
        intro={<p>4 columns on phones, 8 from <code>sm</code> (40rem), 12 from <code>lg</code> (64rem), Tailwind&apos;s default breakpoints. Resize the window to see it change.</p>}
      >
        <Example layout="block" code={`<div className="grid grid-cols-4 gap-4 sm:grid-cols-8 lg:grid-cols-12">…</div>`}>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className={`flex h-20 items-end justify-center rounded-md bg-accent-subtle pb-2 type-sign text-accent-text ${i >= 4 ? "hidden sm:flex" : ""} ${i >= 8 ? "sm:hidden lg:flex" : ""}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </Example>
      </DocSection>

      <DocSection
        id="width"
        title="Content width"
        intro={
          <>
            <p>
              Content sits in a centered column of at most about 76rem plus side margins:{" "}
              <code>&lt;Container&gt;</code>. Running text is at most <code>66ch</code>. Forms, login
              and FAQ use the narrow column of about 48rem (<code>&lt;Container narrow&gt;</code>).
            </p>
            <p>
              Full-bleed bands (<code>tone-ink</code> sections and photo bands) span the viewport,
              with their content back in the column.
            </p>
          </>
        }
      >
        <Example
          layout="block"
          code={`<section className="tone-ink">
  <Container className="py-16">…</Container>
</section>`}
        >
          <div className="flex flex-col gap-3">
            <div className="tone-ink rounded-lg py-6">
              <div className="mx-auto max-w-[80%] rounded-md border border-dashed border-border-strong p-4 type-sign text-muted">
                Container inside a full-bleed band
              </div>
            </div>
            <div className="mx-auto w-full max-w-[60%] rounded-md bg-surface p-4 type-sign text-muted">
              Narrow column · forms, login, FAQ
            </div>
          </div>
        </Example>
      </DocSection>

      <DocSection id="layouts" title="Signature layouts">
        <SpecTable
          head={["", "Layout", "What it is", "See"]}
          rows={[
            ["L1", "Network hero", "Home only. Kicker, expanded headline, one primary button, the six-campus line with member counts, then a large natural-color group photo.", <NavLink key="l" href="/examples/home">Home</NavLink>],
            ["L2", "Route strip", "On long pages, section headings become stations on a vertical route in the gutter; a scrollable strip below lg.", <NavLink key="l" href="/network/route-strip">Route strip</NavLink>],
            ["L3", "Departure board", "Upcoming events as rows: time, event and line badges, station, status.", <NavLink key="l" href="/network/departure-board">Departure board</NavLink>],
            ["L4", "Lines", "Kepengurusan laid out as the network's lines, BPH first.", <NavLink key="l" href="/network/member-card">Member card</NavLink>],
            ["L5", "Route tracker", "The oprec journey: Online form → Written test → Interview → Results.", <NavLink key="l" href="/network/route-tracker">Route tracker</NavLink>],
            ["L6", "Station page", "Event detail: a header like a station sign, then photo, body, registration panel and gallery.", "—"],
            ["L7", "Gallery", "A masonry of event photos in natural ratios, CSS columns 2 / 3 / 4; click opens a dialog.", <NavLink key="l" href="/components/dialog">Dialog</NavLink>],
          ]}
        />
      </DocSection>

      <DocSection id="pages" title="Page compositions">
        <SpecTable
          head={["Page", "Composition"]}
          rows={[
            ["Home", "L1 hero → departure board (tone-ink, next 4 events) → About → numbers → latest news → Guidebook → footer"],
            ["Events", "Title + lede → departure board (upcoming) → past events by month"],
            ["Event detail", "L6"],
            ["Cabinet", "Title + cabinet image + network map → L4 per division"],
            ["Oprec status", "Narrow column: L5 route tracker → the current stage's panel"],
            ["News", "Lead article → article rows"],
            ["FAQ", "Narrow column: category chips → accordion"],
            ["Forms, sign-in", "Narrow column, single form panel"],
          ]}
        />
        <Prose>
          <p>No centered hero, no grid of identical cards, no section with a colored background. Layers come from tone and hairlines.</p>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
