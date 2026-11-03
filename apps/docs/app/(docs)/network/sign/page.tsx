import type { Metadata } from "next"
import { MapPinIcon, StorefrontIcon, TicketIcon, UserIcon } from "@phosphor-icons/react/ssr"

import { ExitBadge, Sign, SignBoard, SignPictogram } from "@ppitsz/ui/components/network/sign"
import { LineBadges } from "@ppitsz/ui/components/network/line-badge"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Signs and exits" }

const SECTIONS = [
  { id: "board", label: "Sign board" },
  { id: "exits", label: "Exits" },
  { id: "anatomy", label: "Anatomy" },
  { id: "rules", label: "Rules" },
]

export default function SignPage() {
  return (
    <DocPage
      href="/network/sign"
      kicker="Network · sign"
      title="Signs and exits"
      lede="The station's overhead sign as a list of destinations: an ink band, a lead cell, the name and the arrow. Pictograms and lines lead into the network; yellow exits lead out of it."
      sections={SECTIONS}
    >
      <DocSection
        id="board"
        title="Sign board"
        intro={
          <p>
            For “where to next”: the app launcher in PPITSZ Account, the end of a finished flow, a
            staff app&apos;s home. The board is always ink, so it reads as signage in light and
            dark pages. Each sign&apos;s title link is stretched over its row.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<SignBoard aria-label="Your apps">
  <Sign
    href="/staff"
    direction="right"
    lead={<SignPictogram><StorefrontIcon /></SignPictogram>}
    title="Shop dashboard"
    description="Admin"
    linkAs={NextLink}
  />
  …
</SignBoard>`}
        >
          <SignBoard aria-label="Your apps" className="max-w-xl">
            <Sign
              href="#"
              direction="right"
              lead={<SignPictogram><StorefrontIcon /></SignPictogram>}
              title="Shop dashboard"
              description="Admin"
            />
            <Sign
              href="#"
              direction="right"
              lead={<SignPictogram><TicketIcon /></SignPictogram>}
              title="Forms dashboard"
              description="Form admin"
            />
            <Sign
              href="#"
              direction="right"
              lead={<SignPictogram><UserIcon /></SignPictogram>}
              title="Your profile"
            />
          </SignBoard>
        </Example>
        <Example
          lang="en"
          layout="block"
          title="Places and lines"
          description="A sign can lead with line badges, and carry a place's Chinese name. A sign without href is information only: no hover, no arrow nudge."
          code={`<Sign direction="left" lead={<LineBadges codes={["danus"]} />} title="Back to GumamChan" href="/gumamchan" />
<Sign direction="ahead" title="SZU" zh="深圳大学" description="Pickup at the north gate, 12:00–14:00" />`}
        >
          <SignBoard aria-label="Pickup" className="max-w-xl">
            <Sign
              href="#"
              direction="left"
              lead={<LineBadges codes={["danus"]} />}
              title="Back to GumamChan"
            />
            <Sign
              direction="ahead"
              lead={<SignPictogram><MapPinIcon /></SignPictogram>}
              title="SZU"
              zh="深圳大学"
              description="Pickup at the north gate, 12:00–14:00"
            />
          </SignBoard>
        </Example>
      </DocSection>

      <DocSection
        id="exits"
        title="Exits"
        intro={
          <p>
            In the metro, yellow means the way out. Here too: an <code>ExitBadge</code> marks a
            link that leaves the app (to the socials, another site, a PDF). Letter the exits A, B,
            C in the order they appear, and keep a letter for the same destination across pages.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<Sign
  href="https://instagram.com/ppitshenzhen"
  direction="out"
  lead={<ExitBadge letter="A" />}
  title="Instagram"
  description="@ppitshenzhen"
  newTab
/>`}
        >
          <SignBoard aria-label="Exits" className="max-w-xl">
            <Sign
              href="https://instagram.com/ppitshenzhen"
              direction="out"
              lead={<ExitBadge letter="A" />}
              title="Instagram"
              description="@ppitshenzhen"
              newTab
            />
            <Sign
              href="https://tiktok.com/@ppitshenzhen"
              direction="out"
              lead={<ExitBadge letter="B" />}
              title="TikTok"
              description="@ppitshenzhen"
              newTab
            />
          </SignBoard>
        </Example>
        <Example
          lang="en"
          title="On its own"
          description="Outside a board the badge marks an exit in a row of links, like a footer."
          code={`<ExitBadge letter="A" />`}
        >
          <ExitBadge letter="A" />
          <ExitBadge letter="B" />
          <ExitBadge letter="C1" />
        </Example>
      </DocSection>

      <DocSection id="anatomy" title="Anatomy">
        <SpecTable
          head={["Part", "Spec"]}
          rows={[
            ["Board", "tone-ink, rounded-xl, rows divided by a border. At least 72px a row."],
            ["Lead", <>Optional. <code>SignPictogram</code> (a 40px light square, the icon at 24px), <code>LineBadges</code> or <code>ExitBadge</code>.</>],
            ["Name", <>type-heading-sm; the Chinese name (places only) and one description line in type-caption.</>],
            ["Arrow", <>Bold, 28px. <code>right</code>, <code>left</code> (drawn before the name), <code>ahead</code> or <code>out</code> (leaves the app). It nudges 2px its way on hover.</>],
            ["Exit badge", <>Exit yellow (<code>--exit</code>), condensed Archivo 800. Screen readers hear “Exit A”.</>],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Exit yellow is not a color token: there is no <code>bg-exit</code>. It appears only through <code>ExitBadge</code>, and the badge only on ways out of the app.</li>
            <li>One board per screen, for the screen&apos;s “where next”. Navigation within a page stays the route strip.</li>
            <li>Pictograms are functional (they name a destination), from the approved icon set. No trains as decoration.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A yellow badge on a link inside the app, or a yellow “Buy now”.</p>}
          doThis={<p>Pictograms and line badges for destinations in the app; an exit letter only when the link leaves it.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
