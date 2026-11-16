import type { Metadata } from "next"
import type { ReactNode } from "react"

import { OgStationSign } from "@ppitsz/ui/components/og/station-sign"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"

export const metadata: Metadata = { title: "Share image" }

const SECTIONS = [
  { id: "image", label: "Share image" },
  { id: "making", label: "Making one" },
  { id: "rules", label: "Rules" },
]

/** The 1200 × 630 image at half size, scrolling sideways on phones. */
function Preview({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <div className="h-[315px] w-[600px] overflow-hidden rounded-xl border">
        <div style={{ width: 1200, height: 630, zoom: 0.5, display: "flex" }}>{children}</div>
      </div>
    </div>
  )
}

export default function ShareImagePage() {
  return (
    <DocPage
      href="/network/share-image"
      kicker="Network · og/station-sign"
      title="Share image"
      lede="What a shared link looks like on WeChat, Instagram or WhatsApp: a station sign in ink with the line on top, the name, when and where, and a short route arriving at the app."
      sections={SECTIONS}
    >
      <DocSection
        id="image"
        title="Share image"
        intro={<p>Every campaign and every form gets its own; every other page shows its app&apos;s. Shown here at half size.</p>}
      >
        <Preview>
          <OgStationSign
            app="PPITSZ Shop"
            kicker="PPIT Shenzhen"
            title="GumamChan at SZ Cup"
            details="Order online until Mon, Mar 15 at 21:00"
            line="danus"
            lines={["danus"]}
          />
        </Preview>
        <Preview>
          <OgStationSign
            app="PPITSZ Forms"
            kicker="Event"
            title="Malam Budaya 2026"
            details="Sat, Nov 14 · 18:30–21:30 · SZU Main hall"
            line="sosbud"
            lines={["sosbud"]}
          />
        </Preview>
      </DocSection>

      <DocSection id="making" title="Making one">
        <Prose>
          <p>
            An <code>opengraph-image.tsx</code> next to the page calls the app&apos;s{" "}
            <code>stationSignImage()</code> (<code>lib/og.tsx</code>), which renders{" "}
            <code>OgStationSign</code> with next/og. Satori draws inline styles only, so the colors
            come from <code>@ppitsz/ui/lib/raw-colors</code>, and Archivo 600 and 800 come from
            the app&apos;s <code>assets/fonts</code> (OFL), traced into the image routes in{" "}
            <code>next.config</code>.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>A draft shares nothing about itself: it gets the app&apos;s image.</li>
            <li>No photos, no prices, no &ldquo;Buy now&rdquo;. The name and the when are enough to tap.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A screenshot of the page, or the cover photo with the title printed over it.</p>}
          doThis={<p>The station sign: line, name, when and where.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
