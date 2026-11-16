import type { Metadata } from "next"

import { StationCode } from "@ppitsz/ui/components/network/station-code"
import { StationNameplate } from "@ppitsz/ui/components/network/station-nameplate"
import { StripMap } from "@ppitsz/ui/components/network/strip-map"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Station nameplate" }

const SECTIONS = [
  { id: "nameplate", label: "Nameplate" },
  { id: "flow", label: "In a flow" },
  { id: "anatomy", label: "Anatomy" },
  { id: "rules", label: "Rules" },
]

export default function StationNameplatePage() {
  return (
    <DocPage
      href="/network/station-nameplate"
      kicker="Network · station-nameplate"
      title="Station nameplate"
      lede="A page's title as the name sign on a platform wall: the line on top, the name, and along the bottom the stations either side. For the pages of a flow, so people always see where they are and what comes next."
      sections={SECTIONS}
    >
      <DocSection
        id="nameplate"
        title="Nameplate"
        intro={<p>The previous station is usually a link back. The next one is usually words only, because the page&apos;s own primary button goes there.</p>}
      >
        <Example
          lang="en"
          layout="block"
          code={`<StationNameplate
  kicker="PPIT Shenzhen"
  name="GumamChan at SZ Cup"
  line="danus"
  lines={["danus"]}
  linkAs={NextLink}
  previous={{ label: "All campaigns", href: "/" }}
  next={{ label: "Checkout" }}
/>`}
        >
          <StationNameplate
            kicker="PPIT Shenzhen"
            name="GumamChan at SZ Cup"
            line="danus"
            lines={["danus"]}
            previous={{ label: "All campaigns", href: "#" }}
            next={{ label: "Checkout" }}
            headingLevel="h2"
            className="max-w-3xl"
          />
        </Example>
      </DocSection>

      <DocSection
        id="flow"
        title="In a flow"
        intro={<p>Children sit inside the band: on checkout and an order&apos;s page, the order code and the strip map, so one sign says where you are and what comes next.</p>}
      >
        <Example
          lang="en"
          layout="block"
          code={`<StationNameplate kicker={campaign.name} name="Finish your payment" line="danus" previous={…}>
  <StationCode code={order.code} line="danus" />
  <StripMap line="danus" stops={stops} current={1} />
</StationNameplate>`}
        >
          <StationNameplate
            kicker="GumamChan at SZ Cup"
            name="Finish your payment"
            line="danus"
            lines={["danus"]}
            previous={{ label: "GumamChan at SZ Cup", href: "#" }}
            headingLevel="h2"
            className="max-w-3xl"
          >
            <p className="flex items-center gap-3">
              <span className="type-kicker text-muted">Order</span>
              <StationCode code="GC-7K3P" line="danus" />
            </p>
            <StripMap
              line="danus"
              stops={[{ label: "Order" }, { label: "Pay", note: "Before 21:00" }, { label: "Verify" }, { label: "Pick up" }]}
              current={1}
              aria-label="Order progress"
            />
          </StationNameplate>
        </Example>
      </DocSection>

      <DocSection id="anatomy" title="Anatomy">
        <SpecTable
          head={["Part", "Spec"]}
          rows={[
            ["Band", "tone-ink, rounded-xl, the line's route across the top."],
            ["Name", <>The page&apos;s <code>h1</code> in type-display-xl, with the kicker and line badges above.</>],
            ["Either side", "Previous and Next, kicker over type-sign, with bold arrows. A link when it has href."],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Only on the pages of a flow (a campaign, its checkout, an order). Dashboards and settings keep a plain heading.</li>
            <li>One nameplate per page, at the top. Nothing above it but the site header and a service notice.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A breadcrumb trail of five links above a plain title.</p>}
          doThis={<p>The nameplate: where you are, the station before, the station next.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
