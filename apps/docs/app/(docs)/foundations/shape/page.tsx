import type { Metadata } from "next"
import Image from "next/image"

import { Button } from "@ppitsz/ui/components/button"
import { Toggle } from "@ppitsz/ui/components/toggle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ppitsz/ui/components/card"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { Interchange, Route, Station } from "@ppitsz/ui/components/network/route"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ppitsz/ui/components/popover"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Shape and elevation" }

const SECTIONS = [
  { id: "language", label: "Shape language" },
  { id: "geometry", label: "Network geometry" },
  { id: "elevation", label: "Elevation" },
]

export default function ShapePage() {
  return (
    <DocPage
      href="/foundations/shape"
      kicker="Foundations"
      title="Shape and elevation"
      lede="Seven shapes, each with one job. Radii come from Tailwind's scale. The site is flat: layers come from tone, not shadow."
      sections={SECTIONS}
    >
      <DocSection id="language" title="Shape language">
        <SpecTable
          head={["Shape", "Applies to", "Character"]}
          rows={[
            [<strong key="s">Capsule</strong>, "Buttons, filter chips, station labels on maps, the interchange, avatars", "The metro “pill”: anything you press or that names a stop"],
            [<strong key="s">Soft panel</strong>, "Panels, dialogs, toasts, popovers, photos in the grid (rounded-xl)", "Station screens and wall panels"],
            [<strong key="s">Square edge</strong>, "Full-bleed photos and bands, table rows", "Architecture"],
            [<strong key="s">Line</strong>, "Routes, dividers inside network graphics", "The network itself: round caps, constant weight"],
            [<strong key="s">Badge</strong>, "Line badges, tags and status badges (rounded-md)", "Line bullets. Never fully round, so codes don't look like buttons"],
            [<strong key="s">Control</strong>, "Text inputs, selects, textareas and menu items (rounded-lg); checkboxes (a 5px corner)", "Fields you type or pick in: softer than a panel, never a capsule"],
            [<strong key="s">Ticket notch</strong>, "Tickets only: a 12px half-circle at each end of the perforation (ticket-notch-t, ticket-notch-b)", "The tear-off stub. The only cut corner in the system"],
          ]}
        />
        <Example layout="block" code={`<Button>Register</Button>          // capsule
<Card>…</Card>                   // soft panel
<Route /> <Station />            // line
<LineBadge code="sosbud" />      // badge`}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="type-kicker text-muted">Capsule</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button>Register</Button>
                <Toggle pressed>Sports</Toggle>
                <Interchange />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="type-kicker text-muted">Badge</span>
              <div className="flex flex-wrap items-center gap-3">
                <LineBadge code="sosbud" />
                <LineBadge code="it" />
                <LineBadge code="medkref" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="type-kicker text-muted">Soft panel</span>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Registration form</CardTitle>
                  <CardDescription>Closes September 30</CardDescription>
                </CardHeader>
              </Card>
            </div>
            <div className="flex flex-col gap-3">
              <span className="type-kicker text-muted">Line</span>
              <span className="relative flex items-center">
                <Route className="absolute inset-x-0" />
                <Station state="passed" />
                <span className="flex-1" />
                <Station state="here" />
                <span className="flex-1" />
                <Station />
              </span>
            </div>
            <div className="flex flex-col gap-3 md:col-span-2">
              <span className="type-kicker text-muted">Square edge</span>
              <Image
                src="/samples/event-3.webp"
                alt="PPIT Shenzhen members in batik posing together in front of a campus building."
                width={1915}
                height={1436}
                sizes="(min-width: 1024px) 50rem, 100vw"
                className="aspect-[21/9] w-full object-cover"
              />
            </div>
          </div>
        </Example>
      </DocSection>

      <DocSection id="geometry" title="Network geometry">
        <Prose>
          <ul>
            <li>Routes run horizontally or vertically. Bends are 45° only; a route never curves freely.</li>
            <li>Stations sit centered on their route.</li>
            <li>Labels never overlap a route: below horizontal routes, right of vertical routes.</li>
            <li>Line weight is constant within a diagram, and every route in one diagram uses the same weight.</li>
            <li>Weight and station size come from the <code>route</code> and <code>station</code> utilities. Don&apos;t restyle them per page.</li>
          </ul>
        </Prose>
      </DocSection>

      <DocSection
        id="elevation"
        title="Elevation"
        intro={
          <p>
            Shadows exist only for things that float above content: dialogs, popovers and toasts.
            In dark mode floating layers use a lighter surface plus a border. No glass, blur, glow
            or colored shadows; the blur scale is removed from the theme.
          </p>
        }
      >
        <Example
          code={`<Popover>
  <PopoverTrigger render={<Button />}>See details</PopoverTrigger>
  <PopoverContent>…</PopoverContent>
</Popover>`}
        >
          <div className="rounded-xl bg-surface px-5 py-4 type-body-sm text-text">Flat panel: tone only</div>
          <Popover>
            <PopoverTrigger render={<Button />}>See details</PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Popover</PopoverTitle>
                <PopoverDescription>Floats above the content, so it may have a shadow.</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </Example>
        <DoDont
          dont={<p>Frosted glass, glows, shadows on cards.</p>}
          doThis={<p>Separate content by tone and hairlines. Shadows only on dialogs, popovers and toasts.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
