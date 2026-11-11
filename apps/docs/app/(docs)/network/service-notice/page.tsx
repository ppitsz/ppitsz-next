import type { Metadata } from "next"

import { Button } from "@ppitsz/ui/components/button"
import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"
import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Service notice" }

const SECTIONS = [
  { id: "notice", label: "Service notice" },
  { id: "kinds", label: "Kinds" },
  { id: "voice", label: "Voice" },
  { id: "not-found", label: "Page not found" },
  { id: "rules", label: "Rules" },
]

export default function ServiceNoticePage() {
  return (
    <DocPage
      href="/network/service-notice"
      kicker="Network · service-notice"
      title="Service notice"
      lede="A station's posted announcement, for a change to something people planned around: pickup moved, a campaign closed early, an event canceled."
      sections={SECTIONS}
    >
      <DocSection
        id="notice"
        title="Service notice"
        intro={
          <p>
            An ink header names the kind and the lines affected; the body says what happened in the
            title and what to do in the text, with one action at most. Place it at the top of the
            page it affects, above everything but the header.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<ServiceNotice
  kind="change"
  lines={["danus"]}
  updatedAt={notice.updatedAt}
  title="Pickup moves to the north gate"
  action={<Button>See pickup times</Button>}
>
  <p>Rain is forecast on Wednesday, so pickup is under the north gate canopy instead of the field. Times stay the same.</p>
</ServiceNotice>`}
        >
          <ServiceNotice
            kind="change"
            lines={["danus"]}
            updatedAt={new Date("2027-03-16T09:30:00+08:00")}
            title="Pickup moves to the north gate"
            action={<Button>See pickup times</Button>}
          >
            <p>Rain is forecast on Wednesday, so pickup is under the north gate canopy instead of the field. Times stay the same.</p>
          </ServiceNotice>
        </Example>
      </DocSection>

      <DocSection id="kinds" title="Kinds">
        <Example lang="en" layout="stack">
          <ServiceNotice kind="notice" lines={["sosbud"]} title="Doors open at 18:30, not 18:00">
            <p>The hall is still being set up. Your ticket works as before.</p>
          </ServiceNotice>
          <ServiceNotice kind="suspended" lines={["depol"]} title="Futsal Cup is canceled">
            <p>The field is closed for repairs. Everyone who registered gets an email; nothing to do.</p>
          </ServiceNotice>
          <ServiceNotice kind="ended" lines={["danus"]} title="GumamChan at SZ Cup has ended">
            <p>Thanks for ordering. Your orders and their QR codes still work below.</p>
          </ServiceNotice>
        </Example>
        <SpecTable
          head={["Kind", "Header", "Use for"]}
          rows={[
            ["notice", "Service notice", "Something to know that changes nothing you do."],
            ["change", "Service change", "Something you planned around moved: place, time, payment."],
            ["suspended", "Service canceled", "It won't happen: an event or campaign canceled."],
            ["ended", "Service has ended", "It finished as planned: a campaign ended, a form closed."],
          ]}
        />
      </DocSection>

      <DocSection
        id="voice"
        title="Voice"
        intro={<p>Metro words for states, plain words for what to do. The metaphor names the situation; the sentence after it always says the real thing.</p>}
      >
        <SpecTable
          head={["Situation", "Title", "Then"]}
          rows={[
            ["Not found (404)", "This station isn't on the network", "Check the address, or go to the main page."],
            ["No orders yet", "No departures yet", "Orders you place show here."],
            ["Campaign ended", "Service has ended", "Your orders still work."],
            ["Disabled account", "This card can't pass the gate", "Message PPITSZ on Instagram to have it checked."],
            ["Nothing open", "No departures scheduled", "The next ones are announced on the PPITSZ socials."],
            ["Error (500)", "Service disruption: Something went wrong", "Try again in a moment. The error code is for IT."],
            ["Scanner offline", "No service: This phone is offline", "Use the printed list until it reconnects."],
            ["Lost the email", "Lost property", "Find it by email."],
            ["Closes within a day", "Final call", "Beside the real status badge, never instead of it."],
          ]}
        />
        <Prose>
          <p>
            Short labels read like signs: a noun or a verb first, no “please”, no exclamation marks. “Have your QR code ready”,
            “Pickup this way”, “Last order 20:00”. Sentences after them stay in the casual “you”.
          </p>
        </Prose>
      </DocSection>

      <DocSection
        id="not-found"
        title="Page not found"
        intro={
          <p>
            A 404 isn&apos;t a notice: nothing changed, the address is wrong. Every app shows the same{" "}
            <code>PageNotFound</code> under its own header; only the sentence differs. Say why the link may be wrong here, then
            link to where to go instead.
          </p>
        }
      >
        <Example
          lang="en"
          layout="block"
          code={`<PageNotFound>
  An order link may have been cut off when copied. Open it again from the original message, or check{" "}
  <Link as={NextLink} href="/orders">Your orders</Link>.
</PageNotFound>`}
        >
          <PageNotFound className="py-0">
            An order link may have been cut off when copied. Open it again from the original message, or check{" "}
            <Link href="#not-found">Your orders</Link>.
          </PageNotFound>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Alert is feedback on the screen&apos;s own task (“Payment proof uploaded”). A service notice is the service itself changing.</li>
            <li>One notice per page, the newest. Remove it once it stops being true.</li>
            <li>Static: no live role, no dismiss button. It is the page&apos;s state.</li>
            <li>
              <code>label</code> replaces the header words in two places only: “Service disruption” on error pages (kind{" "}
              <code>change</code>, heading <code>h1</code>), and “No service” while a scanner is offline (<code>NoService</code>,
              kind <code>suspended</code>, shown only while the phone has no network).
            </li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A red banner reading “IMPORTANT!!” with the details in a linked PDF.</p>}
          doThis={<p>A service change with the new place in the title and the unchanged times in the text.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
