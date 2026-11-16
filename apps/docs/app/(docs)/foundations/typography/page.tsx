import type { Metadata } from "next"

import { StationLabel } from "@ppitsz/ui/components/network/station-label"
import { formatDate, formatNumber, formatRupiah, formatTimeWithWib } from "@ppitsz/ui/lib/format"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { NOW } from "@/lib/sample-data"

export const metadata: Metadata = { title: "Typography" }

const SECTIONS = [
  { id: "families", label: "Families" },
  { id: "width", label: "Width" },
  { id: "scale", label: "Type scale" },
  { id: "languages", label: "Three languages" },
  { id: "rules", label: "Rules" },
]

const SCALE: [string, string, string, string][] = [
  ["type-display-2xl", "Archivo 800 · 44→120px · wdth 112→125", "Home hero h1 only", "One network."],
  ["type-display-xl", "Archivo 800 · 38→80px · wdth 112→125", "Page h1", "Kepengurusan"],
  ["type-display-lg", "Archivo 750 · 32→56px · wdth 112", "Section h2, lead member name", "Upcoming events"],
  ["type-heading-lg", "Archivo 700 · 24→32px", "h3, event and article titles", "Shenzhen Cup 2026"],
  ["type-heading-md", "Archivo 650 · 20→24px", "h4, member names", "Malik Ihsan Fathurrahman"],
  ["type-heading-sm", "Archivo 700 · 17px", "Form section headings, footer titles", "Data diri"],
  ["type-numeral", "Archivo 700 · 40→72px · tabular", "Dates and stats", "14"],
  ["type-sign", "Archivo 600 · 15px · wdth 87.5", "Station names, timetable cells, metadata", "CUHK-Shenzhen · 19.00"],
  ["type-kicker", "Archivo 600 · 13px · +0.08em · caps", "Section kickers, status badges", "Upcoming events"],
  ["type-ui", "Archivo 600 · 16px", "Buttons, nav links, labels", "See all events"],
  ["type-lede", "Atkinson 400 · 20→24px", "Standfirst under an h1", "More than five hundred students on six campuses."],
  ["type-body-lg", "Atkinson 400 · 18→20px", "Articles, About", "We meet every month on a different campus."],
  ["type-body", "Atkinson 400 · 17→18px", "Default body, input text", "Recruitment is open until September 30."],
  ["type-body-sm", "Atkinson 400 · 15px", "Summaries, toast messages", "We'll let you know by email."],
  ["type-caption", "Atkinson 400 · 14px", "Captions, helper and error text", "Photo: Media Kreatif division"],
]

const WIDTHS: [number, string, string][] = [
  [125, "Expanded", "Display sizes on screens ≥ 64rem"],
  [112, "Semi-expanded", "Display sizes on phones, type-display-lg"],
  [100, "Normal", "Headings, UI labels, buttons, numerals"],
  [87.5, "Semi-condensed", "type-sign: station names, timetables"],
  [75, "Condensed", "Line badges"],
]

export default function TypographyPage() {
  const date = new Date("2026-11-14T19:00:00+08:00")
  return (
    <DocPage
      href="/foundations/typography"
      kicker="Foundations"
      title="Typography"
      lede="Archivo at five widths for headings, labels and signage, Atkinson Hyperlegible Next for reading, and Noto Sans SC for Chinese. Set text with a single type-* class."
      sections={SECTIONS}
    >
      <DocSection id="families" title="Families">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-6">
            <p className="type-kicker text-muted">Display, headings, signage, UI</p>
            <p className="type-display-lg text-text">Archivo</p>
            <p className="type-body-sm text-muted">
              A grotesque with a width axis from 62 to 125: expanded headlines, standard headings,
              semi-condensed station labels and condensed line badges from one family.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-6">
            <p className="type-kicker text-muted">Body, lede, captions, forms</p>
            <p className="type-heading-lg text-text">Atkinson Hyperlegible Next</p>
            <p className="type-body-sm text-muted">
              Designed by the Braille Institute so that similar characters stay distinct: I, l and
              1, or 0 and O. That matters for student IDs, room codes and second-language readers.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-6">
            <p className="type-kicker text-muted">Chinese, all roles</p>
            <p lang="zh-Hans" className="type-display-lg text-text">思源黑体</p>
            <p className="type-body-sm text-muted">
              Noto Sans SC: a 黑体 (sans), the style of Chinese metro signage, with weights that
              match Archivo&apos;s.
            </p>
          </div>
        </div>
        <Prose>
          <p>
            Fonts load only through <code>next/font/google</code>, which self-hosts them. Never the
            Google Fonts CDN, which is unreliable from mainland China, where most readers are. Noto
            Sans SC needs <code>preload: false</code>; the browser downloads only the unicode-range
            slices a page uses.
          </p>
        </Prose>
      </DocSection>

      <DocSection
        id="width"
        title="Width"
        intro={
          <p>
            Width is set inside the <code>type-*</code> utilities. Never set it by hand and never
            fake it with <code>scale-x</code>. The specimens below override it only to show the
            axis.
          </p>
        }
      >
        <ol className="flex flex-col border-t">
          {WIDTHS.map(([wdth, name, use]) => (
            <li key={wdth} className="grid gap-2 border-b py-5 md:grid-cols-[10rem_minmax(0,1fr)] md:items-baseline">
              <span className="flex flex-col">
                <span className="type-sign text-text">{wdth} · {name}</span>
                <span className="type-caption text-muted">{use}</span>
              </span>
              <span
                className="type-heading-lg text-text"
                style={{ fontVariationSettings: `"wdth" ${wdth}` }}
              >
                Kepengurusan 2026/2027
              </span>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection
        id="scale"
        title="Type scale"
        intro={<p>Fluid sizes interpolate from a 360px to a 1440px viewport. Heading levels: <code>h2</code> → display-lg, <code>h3</code> → heading-lg, <code>h4</code> → heading-md. Never skip levels.</p>}
      >
        <ol className="flex flex-col border-t">
          {SCALE.map(([name, spec, use, sample]) => (
            <li key={name} className="grid gap-3 border-b py-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
              <span className="flex flex-col gap-1" lang="en">
                <code className="type-sign text-text">{name}</code>
                <span className="type-caption text-muted">{spec}</span>
                <span className="type-caption text-muted">{use}</span>
              </span>
              <span className={`${name} min-w-0 text-text`}>{sample}</span>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection
        id="languages"
        title="Three languages"
        intro={
          <p>
            Bahasa Indonesia comes first. Indonesian runs 20–30% longer than English, so test every
            component with its longest Indonesian label. Mark Chinese blocks{" "}
            <code>lang=&quot;zh-Hans&quot;</code>: the CSS switches to Noto Sans SC, drops tracking,
            uppercase and italics, scales display sizes and loosens line heights.
          </p>
        }
      >
        <Example
          title="The same block in each language"
          layout="block"
          code={`<section lang="zh-Hans">
  <p className="type-kicker">即将举行的活动</p>
  <h3 className="type-heading-lg">深圳杯 2026</h3>
  <p className="type-body">羽毛球、篮球……<em>欢迎</em>所有校区的同学参加。</p>
</section>`}
        >
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="type-kicker text-accent-text">Upcoming events</p>
              <h3 className="type-heading-lg text-text">Shenzhen Cup 2026</h3>
              <p className="type-body text-text">
                Badminton, basketball, Mobile Legends and mini soccer. <em>Open</em> to every campus.
              </p>
            </div>
            <div lang="en" className="flex flex-col gap-2">
              <p className="type-kicker text-accent-text">Upcoming events</p>
              <h3 className="type-heading-lg text-text">Shenzhen Cup 2026</h3>
              <p className="type-body text-text">
                Badminton, basketball, Mobile Legends and mini soccer. <em>Open</em> to every campus.
              </p>
            </div>
            <div lang="zh-Hans" className="flex flex-col gap-2">
              <p className="type-kicker text-accent-text">即将举行的活动</p>
              <h3 className="type-heading-lg text-text">深圳杯 2026</h3>
              <p className="type-body text-text">
                羽毛球、篮球、王者荣耀和五人制足球。<em>欢迎</em>所有校区的同学参加。
              </p>
            </div>
          </div>
        </Example>
        <Example
          title="Bilingual station label"
          description="The Latin name in type-sign, the Chinese name below in type-caption."
          code={`<StationLabel name="CUHK-Shenzhen" zh="香港中文大学（深圳）" />`}
        >
          <StationLabel name="CUHK-Shenzhen" zh="香港中文大学（深圳）" />
          <StationLabel name="SUSTech" zh="南方科技大学" />
          <StationLabel name="Tsinghua SIGS" zh="清华大学深圳国际研究生院" />
        </Example>
        <SpecTable
          head={["Format", "English (the UI)", "Bahasa Indonesia (an Indonesian block)"]}
          rows={[
            ["Date", formatDate(date), formatDate(date, "id")],
            ["Time with WIB", formatTimeWithWib(date), formatTimeWithWib(date, "id")],
            ["Number", formatNumber(1500), formatNumber(1500, "id")],
            ["Money", formatRupiah(50000), formatRupiah(50000, "id")],
            ["Today (fixed for previews)", formatDate(NOW), formatDate(NOW, "id")],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>No text below 13px. 13px is only for uppercase kickers; line badges are 12px condensed codes, not sentences.</li>
            <li>Body text is never below 17px. Input text is never below 16px, so iOS doesn&apos;t zoom on focus.</li>
            <li>Left-aligned, never justified. Running text at most 66ch (Chinese at most 38em).</li>
            <li>Uppercase only through <code>type-kicker</code> and line badges. Sentence case everywhere else.</li>
            <li>Keep expanded hero copy short; put <code>&amp;shy;</code> in an unavoidable long word and check at 320px.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p><code>text-5xl font-black tracking-tight</code>, or stretching type with <code>scale-x</code>.</p>}
          doThis={<p>One <code>type-*</code> class. The width axis is set inside it.</p>}
        />
        <DoDont
          dont={<p>Tracking, uppercase kickers or italics on Chinese, or a Chinese block without <code>lang</code>.</p>}
          doThis={<p><code>lang=&quot;zh-Hans&quot;</code> on the block. The CSS handles fonts, line height and emphasis dots.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
