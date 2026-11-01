import type { Metadata } from "next"
import Image from "next/image"
import * as Icons from "@phosphor-icons/react/ssr"

import { PpiMark } from "@ppitsz/ui/components/blocks/brand"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Imagery and icons" }

const SECTIONS = [
  { id: "photography", label: "Photography" },
  { id: "ratios", label: "Aspect ratios" },
  { id: "mark", label: "The PPI mark" },
  { id: "icons", label: "Icons" },
]

const APPROVED = [
  "ArrowRight", "ArrowUpRight", "ArrowLeft", "CaretDown", "CaretRight", "List", "X",
  "CalendarBlank", "Clock", "MapPin", "Globe", "User", "DownloadSimple", "UploadSimple",
  "Copy", "Trash", "MagnifyingGlass", "SignOut", "Images", "QrCode", "EnvelopeSimple",
  "Check", "CheckCircle", "Warning", "WarningCircle", "Info", "CircleNotch", "SunDim",
  "Moon", "InstagramLogo", "TiktokLogo", "LinkedinLogo", "YoutubeLogo", "WechatLogo",
] as const

const RATIOS: [string, string, string][] = [
  ["aspect-[21/9]", "21:9", "Home hero on desktop"],
  ["aspect-video", "16:9", "Lead article"],
  ["aspect-[3/2]", "3:2", "Events and standard images"],
  ["aspect-[4/5]", "4:5", "Portraits, hero on phones"],
  ["aspect-square", "1:1", "Avatars only"],
]

export default function ImageryPage() {
  return (
    <DocPage
      href="/foundations/imagery"
      kicker="Foundations"
      title="Imagery and icons"
      lede="Photos of real members, events and places in Shenzhen, in natural color with nothing printed on top. Icons are for function only."
      sections={SECTIONS}
    >
      <DocSection id="photography" title="Photography">
        <figure className="flex flex-col gap-3">
          <Image
            src="/samples/group.webp"
            alt="PPIT Shenzhen committee members standing on campus steps holding the organization's banner."
            width={6000}
            height={4000}
            sizes="(min-width: 1280px) 50rem, 100vw"
            className="aspect-[3/2] w-full rounded-xl object-cover"
          />
          <figcaption className="type-caption text-muted">
            Committee group photo on the campus steps. Photo: Media Kreatif division (sample caption).
          </figcaption>
        </figure>
        <Prose>
          <ul>
            <li><strong>Real only:</strong> members, events, campuses, Shenzhen. No stock, AI images, 3D renders or illustrations standing in for people.</li>
            <li><strong>Natural color.</strong> No darkening, duotone, overlays or filters.</li>
            <li><strong>No text on photos.</strong> Titles and captions sit beside or below; only a status badge may sit over a photo.</li>
            <li><strong>Captions</strong> read like a station label: what happened, where, when, and who took it (“Photo: …”).</li>
            <li><strong>Portraits</strong> are raw 4:5 photos with no names baked in. Names, roles and campuses are live HTML.</li>
            <li><strong>Alt text</strong> describes the scene in the page language. Thumbnails whose title already names them use <code>alt=&quot;&quot;</code>. Never “image of…”.</li>
            <li><strong>Delivery:</strong> <code>next/image</code> with a <code>sizes</code> value matching the layout; <code>priority</code> only on the hero.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>Darken a photo and center a headline, a subtext and two buttons on it.</p>}
          doThis={<p>The photo in natural color, with the heading beside or above it.</p>}
        />
      </DocSection>

      <DocSection id="ratios" title="Aspect ratios" intro={<p>Crop with <code>object-cover</code> and a stored focal point. Never crop through a face at the edge.</p>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {RATIOS.map(([cls, ratio, use]) => (
            <figure key={ratio} className="flex flex-col gap-2">
              <div className={`${cls} overflow-hidden rounded-lg bg-surface`}>
                <Image
                  src="/samples/event-1.webp"
                  alt=""
                  width={2456}
                  height={1842}
                  sizes="12rem"
                  className="size-full object-cover"
                />
              </div>
              <figcaption className="flex flex-col">
                <span className="type-sign text-text">{ratio}</span>
                <span className="type-caption text-muted">{use}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="mark"
        title="The PPI mark"
        intro={
          <p>
            Red on light backgrounds, white on dark and <code>tone-ink</code>. The{" "}
            <code>PpiMark</code> component switches through the theme tokens. Never on photos,
            never recolored, never redrawn as a line badge. The yearly cabinet mark sits next to it
            in the header, after a thin divider, and never changes tokens, fonts or components.
          </p>
        }
      >
        <Example code={`<PpiMark className="h-24" />`}>
          <PpiMark className="h-28" />
          <div className="tone-ink flex items-center rounded-xl p-6">
            <PpiMark className="h-28" />
          </div>
        </Example>
        <Prose>
          <p>The repository has only raster versions of the mark. Tracing an SVG is a follow-up.</p>
        </Prose>
      </DocSection>

      <DocSection
        id="icons"
        title="Icons"
        intro={
          <p>
            Phosphor, through shadcn&apos;s <code>iconLibrary: &quot;phosphor&quot;</code>. Server
            Components import from <code>@phosphor-icons/react/ssr</code>, Client Components from{" "}
            <code>@phosphor-icons/react</code>. <code>bold</code> at 16px, <code>regular</code> at
            20 and 24px, always <code>currentColor</code>. Function only: no metro or train
            icons as decoration.
          </p>
        }
      >
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {APPROVED.map((name) => {
            const Icon = Icons[`${name}Icon` as keyof typeof Icons] as React.ComponentType<{
              className?: string
              "aria-hidden"?: boolean
            }>
            return (
              <li key={name} className="flex items-center gap-3">
                <Icon aria-hidden className="size-6 shrink-0 text-text" />
                <code className="type-caption text-muted">{name}Icon</code>
              </li>
            )
          })}
        </ul>
        <SpecTable
          head={["Size", "Weight", "Where"]}
          rows={[
            ["16px", "bold", "Inside small buttons, chips, error messages"],
            ["20px", "regular", "Buttons, menu items, notices"],
            ["24px", "regular", "Icon-only buttons, accordion carets"],
          ]}
        />
        <Prose>
          <p>Icon-only buttons need an <code>aria-label</code> in the page language and a hit area of at least 44 × 44px. Decorative icons are <code>aria-hidden</code>.</p>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
