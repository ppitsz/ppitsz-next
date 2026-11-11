import type { Metadata } from "next"
import { QrCodeIcon } from "@phosphor-icons/react/ssr"

import {
  Ticket,
  TicketBody,
  TicketCode,
  TicketField,
  TicketFields,
  TicketHeader,
  TicketStub,
  TicketTitle,
} from "@ppitsz/ui/components/blocks/ticket"
import { LineBadges } from "@ppitsz/ui/components/network/line-badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Ticket" }

const SECTIONS = [
  { id: "ticket", label: "Ticket" },
  { id: "order", label: "Order to collect" },
  { id: "void", label: "Not valid" },
  { id: "anatomy", label: "Anatomy" },
  { id: "rules", label: "Rules" },
]

/** Stands in for the QR the apps render as inline SVG. */
function SampleQr() {
  return (
    <div
      role="img"
      aria-label="Ticket QR code K7P3QX"
      className="flex aspect-square w-full max-w-56 items-center justify-center rounded-xl border-2 border-border-strong"
    >
      <QrCodeIcon aria-hidden className="size-24 text-text" />
    </div>
  )
}

export default function TicketPage() {
  return (
    <DocPage
      href="/network/ticket"
      kicker="Network · ticket"
      title="Ticket"
      lede="A metro ticket for an event ticket or an order to collect: an ink body on the organizing division's line, and a light stub that tears off along a perforation, with the QR."
      sections={SECTIONS}
    >
      <DocSection
        id="ticket"
        title="Ticket"
        intro={<p>A Forms ticket (ADR 0003): what it is for, whose it is, then the cells people look for at the door.</p>}
      >
        <Example
          lang="en"
          layout="block"
          code={`<Ticket aria-labelledby="ticket-name">
  <TicketBody line="sosbud">
    <TicketHeader>
      <LineBadges codes={["sosbud"]} />
      <span className="type-sign text-muted">Regular</span>
    </TicketHeader>
    <TicketTitle id="ticket-name" lang="id">Malam Budaya 2026</TicketTitle>
    <TicketFields>
      <TicketField label="Name">Titan Aldebaran</TicketField>
      <TicketField label="Date">Sat, Nov 14</TicketField>
      <TicketField label="Doors">18:30</TicketField>
      <TicketField label="Station">SZU · Main hall</TicketField>
    </TicketFields>
  </TicketBody>
  <TicketStub>
    <TicketQr url={url} />
    <TicketCode>K7P3QX</TicketCode>
  </TicketStub>
</Ticket>`}
        >
          <Ticket aria-labelledby="ticket-name" className="max-w-xl">
            <TicketBody line="sosbud">
              <TicketHeader>
                <LineBadges codes={["sosbud"]} />
                <span className="type-sign text-muted">Regular</span>
              </TicketHeader>
              <TicketTitle id="ticket-name" lang="id">Malam Budaya 2026</TicketTitle>
              <TicketFields>
                <TicketField label="Name">Titan Aldebaran</TicketField>
                <TicketField label="Date">Sat, Nov 14</TicketField>
                <TicketField label="Doors">18:30</TicketField>
                <TicketField label="Station">SZU · Main hall</TicketField>
              </TicketFields>
            </TicketBody>
            <TicketStub>
              <SampleQr />
              <TicketCode>K7P3QX</TicketCode>
            </TicketStub>
          </Ticket>
        </Example>
      </DocSection>

      <DocSection
        id="order"
        title="Order to collect"
        intro={<p>A Shop pickup order is a ticket too: the order code is the ticket number, and the booth scans the stub.</p>}
      >
        <Example lang="en" layout="block">
          <Ticket aria-labelledby="order-ticket" className="max-w-xl">
            <TicketBody line="danus">
              <TicketHeader>
                <LineBadges codes={["danus"]} />
                <StatusBadge domain="order" value="paid" />
              </TicketHeader>
              <TicketTitle id="order-ticket">GumamChan at SZ Cup</TicketTitle>
              <TicketFields>
                <TicketField label="Order">GC-7K3P</TicketField>
                <TicketField label="Items">3</TicketField>
                <TicketField label="Pick up">Wed, Mar 17</TicketField>
                <TicketField label="Station">Booth Danus</TicketField>
              </TicketFields>
            </TicketBody>
            <TicketStub>
              <SampleQr />
              <TicketCode label="Show this at the booth">GC-7K3P</TicketCode>
            </TicketStub>
          </Ticket>
        </Example>
      </DocSection>

      <DocSection
        id="void"
        title="Not valid"
        intro={<p>A canceled ticket keeps its body, so people can see which one it was, and says why in the stub instead of showing a QR.</p>}
      >
        <Example lang="en" layout="block">
          <Ticket aria-labelledby="void-ticket" className="max-w-xl">
            <TicketBody line="sosbud">
              <TicketHeader>
                <LineBadges codes={["sosbud"]} />
                <StatusBadge domain="form" value="cancelled" />
              </TicketHeader>
              <TicketTitle id="void-ticket" lang="id">Malam Budaya 2026</TicketTitle>
            </TicketBody>
            <TicketStub className="items-start">
              <p className="type-body text-text">This event was canceled, so this ticket isn&apos;t valid.</p>
            </TicketStub>
          </Ticket>
        </Example>
      </DocSection>

      <DocSection id="anatomy" title="Anatomy">
        <SpecTable
          head={["Part", "Spec"]}
          rows={[
            ["Body", <>tone-ink, the line&apos;s route across the top. Set <code>line</code> on <code>TicketBody</code>, inside the ink, so the line takes its dark value.</>],
            ["Fields", <>A <code>&lt;dl&gt;</code>: kicker labels, type-sign values. Two across, four from a 448px column.</>],
            ["Perforation", "A 2px dashed rule with a 12px notch at each end, cut with a mask."],
            ["Stub", <>Always light (<code>scope-light</code>), so the QR is black on white for scanners in dark mode. Under the QR, the code to read out.</>],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>The notches are the only cut corners in the system, and only tickets have them.</li>
            <li>One ticket per screen, at full column width up to 36rem.</li>
            <li><code>dispense</code> only when the ticket is new this moment: Forms right after sign-up, Shop in the minutes after the payment is checked. See Motion.</li>
            <li>No barcodes, holograms or fake serial numbers: every field is real data.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A ticket with a gradient, a glossy shine or a drop shadow.</p>}
          doThis={<p>Flat ink and paper, the line on top, and the perforation.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
