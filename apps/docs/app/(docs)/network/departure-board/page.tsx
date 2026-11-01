import type { Metadata } from "next"

import {
  DepartureBoard,
  DepartureNow,
  DepartureRow,
} from "@ppitsz/ui/components/blocks/departure-board"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { SamplePhoto } from "@/components/docs/sample-media"
import { NOW, PAST_EVENTS, UPCOMING_EVENTS } from "@/lib/sample-data"

export const metadata: Metadata = { title: "Departure board" }

const SECTIONS = [
  { id: "board", label: "Board" },
  { id: "timeline", label: "Timeline" },
  { id: "variants", label: "Variants" },
  { id: "anatomy", label: "Anatomy" },
  { id: "rules", label: "Rules" },
]

const thumbs = ["batik", "night", "beach", "group"] as const

export default function DepartureBoardPage() {
  const [next, ...rest] = [...UPCOMING_EVENTS].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  return (
    <DocPage
      href="/network/departure-board"
      kicker="Network · departure-board"
      title="Departure board"
      lede="Events as rows on a board, not cards. Each row shows the time, the event and its division, the venue, and whether registration is open."
      sections={SECTIONS}
    >
      <DocSection id="board" title="Board" intro={<p>On the home page it is a <code>tone-ink</code> station screen showing the next four events; the first row is the next departure. Content is illustrative, “today” is fixed at 13 October 2026.</p>}>
        <Example
          layout="block"
          defaultMode="ink"
          code={`<DepartureBoard>
  <DepartureRow variant="next" event={next} media={<Image … />} linkAs={NextLink} />
  {rest.map((event) => <DepartureRow key={event.slug} event={event} linkAs={NextLink} />)}
</DepartureBoard>`}
        >
          <DepartureBoard>
            {next && (
              <DepartureRow
                variant="next"
                event={next}
                now={NOW}
                media={<SamplePhoto photo="batik" sizes="(min-width: 1024px) 24rem, 100vw" />}
              />
            )}
            {rest.map((event) => (
              <DepartureRow key={event.slug} event={event} now={NOW} />
            ))}
          </DepartureBoard>
        </Example>
      </DocSection>

      <DocSection
        id="timeline"
        title="Timeline"
        intro={<p>On the events index the board runs on <code>bg</code> with a vertical route along the time column: each row is a station, and “You are here” sits between the last past row and the next upcoming one.</p>}
      >
        <Example layout="block" code={`<DepartureBoard>
  {past.map((e) => <DepartureRow key={e.slug} event={e} variant="past" timeline />)}
  <DepartureNow />
  {upcoming.map((e) => <DepartureRow key={e.slug} event={e} timeline media={…} />)}
</DepartureBoard>`}>
          <DepartureBoard>
            {PAST_EVENTS.map((event) => (
              <DepartureRow key={event.slug} event={event} variant="past" timeline />
            ))}
            <DepartureNow />
            {UPCOMING_EVENTS.slice(0, 3).map((event, i) => (
              <DepartureRow
                key={event.slug}
                event={event}
                timeline
                media={<SamplePhoto photo={thumbs[i % thumbs.length]!} sizes="9rem" />}
              />
            ))}
          </DepartureBoard>
        </Example>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Example title="Compact" description="For side lists and related events: time, title, badge." layout="block" code={`<DepartureRow variant="compact" event={event} />`}>
          <ol className="flex max-w-sm flex-col border-t">
            {UPCOMING_EVENTS.slice(0, 3).map((event) => (
              <DepartureRow key={event.slug} event={event} variant="compact" />
            ))}
          </ol>
        </Example>
        <Example title="Empty" layout="block" code={`<Empty>…No upcoming events yet.…</Empty>`}>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No upcoming events yet.</EmptyTitle>
              <EmptyDescription>
                Follow <a href="https://www.instagram.com/ppitshenzhen/">our Instagram</a> for the latest news.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Example>
      </DocSection>

      <DocSection id="anatomy" title="Anatomy">
        <SpecTable
          head={["Column", "Content"]}
          rows={[
            ["Time", "Day in type-numeral, month and weekday in type-sign, the start time below. A <time> with the +08:00 offset."],
            ["Event", "The title in type-heading-lg (a heading wrapping the stretched link), then the line badge(s)."],
            ["Station", "The campus station label, bilingual, with the venue in type-caption."],
            ["Status", "A status badge; “Register” for open registration; “View gallery” for past events."],
            ["Thumbnail", "An optional 3:2 image from lg up, alt=\"\"."],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Hover gives the row a <code>surface-strong</code> fill and underlines the title; the photo doesn&apos;t change. Focus outlines the whole row.</li>
            <li>Only the next departure gets the red “Register”; other rows use a secondary button, so a board never shows several red buttons.</li>
            <li>Relative time (“In 12 days”) updates once a day. No ticking countdowns or split-flap animation.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A grid of event cards with photos on top and buttons underneath.</p>}
          doThis={<p>Rows on a board: time, event and line, station, status.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
