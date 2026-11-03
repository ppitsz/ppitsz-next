import type { Metadata } from "next"

import { Button } from "@ppitsz/ui/components/button"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { Route, Station } from "@ppitsz/ui/components/network/route"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { DIVISIONS } from "@ppitsz/ui/lib/network"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Color" }

const SECTIONS = [
  { id: "concept", label: "Concept" },
  { id: "ramps", label: "Ramps" },
  { id: "tokens", label: "Semantic tokens" },
  { id: "lines", label: "Division lines" },
  { id: "tone-ink", label: "Station screen" },
  { id: "contrast", label: "Contrast" },
  { id: "rules", label: "Rules" },
]

const MERAH = [
  ["50", "0.97 0.012 29", "#FDF2F0"],
  ["100", "0.935 0.03 29", "#FDE3DE"],
  ["200", "0.885 0.055 29", "#FCCCC5"],
  ["300", "0.81 0.1 29", "#FBA89C"],
  ["400", "0.72 0.17 29", "#FD7464"],
  ["500", "0.635 0.225 29", "#F5392C"],
  ["600", "0.56 0.215 29", "#D61E17"],
  ["700", "0.48 0.18 29", "#AC1B14"],
  ["800", "0.4 0.145 29", "#841711"],
  ["900", "0.32 0.11 29", "#5F120D"],
  ["950", "0.24 0.075 29", "#3C0C08"],
]
const BETON = [
  ["50", "0.982 0.003 255", "#F8F9FB"],
  ["100", "0.962 0.005 255", "#F0F3F6"],
  ["200", "0.925 0.007 255", "#E3E6EB"],
  ["300", "0.87 0.009 255", "#D0D5DA"],
  ["400", "0.74 0.012 255", "#A6ABB2"],
  ["500", "0.61 0.013 255", "#7E848B"],
  ["600", "0.51 0.014 255", "#61676E"],
  ["700", "0.42 0.014 255", "#484E55"],
  ["800", "0.32 0.013 255", "#2E333A"],
  ["900", "0.235 0.011 255", "#1B1E23"],
  ["950", "0.17 0.009 255", "#0D1013"],
]
const STATUS_RAMPS: [string, string[]][] = [
  ["hijau", ["50", "300", "600", "700", "950"]],
  ["amber", ["50", "300", "600", "800", "950"]],
]

const TOKENS: [string, string, string, string][] = [
  ["bg", "white", "beton-950", "Page"],
  ["surface", "beton-50", "beton-900", "Panels, image placeholders, skeletons"],
  ["surface-strong", "beton-100", "beton-800", "Hover fills, pressed rows"],
  ["surface-raised", "white", "beton-800", "Inputs, dialogs, popovers, toasts"],
  ["text", "beton-950", "beton-50", "Body text and headings"],
  ["muted", "beton-600", "beton-400", "Secondary text, metadata, placeholders"],
  ["subtle", "beton-500", "beton-500", "Disabled text only"],
  ["border", "beton-200", "beton-800", "Dividers (decorative)"],
  ["border-strong", "beton-500", "beton-500", "Control boundaries (≥ 3:1)"],
  ["accent", "merah-600", "merah-600", "Primary button fill"],
  ["accent-hover", "merah-700", "merah-700", "Primary hover"],
  ["accent-active", "merah-800", "merah-800", "Primary pressed"],
  ["accent-fg", "white", "white", "Text on accent"],
  ["accent-text", "merah-700", "merah-300", "Links, kickers, current-page markers"],
  ["accent-subtle", "merah-50", "merah-950", "Selected rows"],
  ["accent-line", "merah-500", "merah-500", "The brand line (the default --line)"],
  ["focus", "beton-950", "beton-50", "Focus outline"],
  ["highlight", "amber-300", "amber-300", "<mark>, ::selection, “New”"],
  ["success", "hijau-600", "hijau-300", "Success icons and edges"],
  ["success-text", "hijau-700", "hijau-300", "Success text"],
  ["success-subtle", "hijau-50", "hijau-950", "Success fills"],
  ["warning", "amber-600", "amber-300", "Warning icons and edges"],
  ["warning-text", "amber-800", "amber-300", "Warning text"],
  ["warning-subtle", "amber-50", "amber-950", "Warning fills"],
  ["danger", "merah-600", "merah-400", "Errors, destructive edges"],
  ["danger-text", "merah-700", "merah-300", "Error text"],
  ["danger-subtle", "merah-50", "merah-950", "Error fills"],
  ["backdrop", "beton-950 / 50%", "beton-950 / 72%", "Dialog backdrop"],
]

const LINE_VALUES: Record<string, [string, string]> = {
  bph: ["#D61E17", "#F66E5E"],
  danus: ["#C94E0C", "#FA934E"],
  depol: ["#1D8139", "#50C76A"],
  humas: ["#0D6ABB", "#60AAF3"],
  it: ["#037A84", "#43C2CF"],
  medkref: ["#BC2B74", "#F471AA"],
  pka: ["#6D44D6", "#A492FB"],
  sosbud: ["#9623A8", "#D879E6"],
}

function Ramp({ name, steps }: { name: string; steps: string[][] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-heading-sm text-text">{name}</p>
      <ol className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
        {steps.map(([step, oklch, hex]) => (
          <li key={step} className="flex flex-col gap-1.5">
            <span
              aria-hidden
              className="h-14 rounded-lg border"
              style={{ background: `var(--color-${name}-${step})` }}
            />
            <span className="type-sign text-text">{step}</span>
            <span className="type-caption text-muted">{hex}</span>
            {oklch && <span className="sr-only">oklch({oklch})</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function LinePanel({ ink }: { ink?: boolean }) {
  return (
    <div className={ink ? "tone-ink rounded-xl p-6" : "rounded-xl border p-6"}>
      <p className="mb-5 type-kicker text-muted">{ink ? "Dark / tone-ink" : "Light"}</p>
      <ul className="flex flex-col gap-4">
        {DIVISIONS.map((division) => (
          <li key={division.code} data-line={division.code} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4">
            <LineBadge code={division.code} className="justify-self-start" />
            <span aria-hidden className="relative flex items-center">
              <Route className="absolute inset-x-0" />
              <Station state="passed" />
              <span className="flex-1" />
              <Station state="here" />
            </span>
            <span className="type-caption text-muted tabular-nums">
              {LINE_VALUES[division.code]![ink ? 1 : 0]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ColourPage() {
  return (
    <DocPage
      href="/foundations/color"
      kicker="Foundations"
      title="Color"
      lede="Neutral grays for the page, one red for the brand and the main action, and eight division colors that appear only in network graphics."
      sections={SECTIONS}
    >
      <DocSection
        id="concept"
        title="Concept"
        intro={
          <>
            <ul>
              <li><strong>Station architecture</strong> is white and cool concrete (<code>beton</code>).</li>
              <li><strong>Signage ink</strong> is near-black, with a hint of blue.</li>
              <li><strong>One signal red</strong> (<code>merah</code>) is the PPITSZ line and the call to action.</li>
              <li><strong>Eight line colors</strong> identify divisions, and appear only in network graphics.</li>
              <li><strong>Status colors</strong> are green and amber, used for states only.</li>
              <li><strong>Exit yellow</strong> (<code>--exit</code>, amber-300) marks the way out, as on metro exit signs. It is not a color token: only the exit badge reads it.</li>
            </ul>
            <p>
              Real transit systems keep their architecture neutral so line colors read at a glance.
              The site does the same. <code>merah-500</code> (#F5392C) is warmer and brighter than the
              logo's crimson (#ED1C24), but close enough to read as the same brand.
            </p>
          </>
        }
      />

      <DocSection
        id="ramps"
        title="Ramps"
        intro={
          <p>
            Implemented in OKLCH, all inside sRGB; hex values are for reference. Components never
            use ramps directly; they use the semantic tokens below.
          </p>
        }
      >
        <Ramp name="merah" steps={MERAH} />
        <Ramp name="beton" steps={BETON} />
        <div className="grid gap-8 md:grid-cols-2">
          {STATUS_RAMPS.map(([name, steps]) => (
            <div key={name} className="flex flex-col gap-3">
              <p className="type-heading-sm text-text">{name} <span className="type-caption text-muted">(status only)</span></p>
              <ol className="grid grid-cols-5 gap-2">
                {steps.map((step) => (
                  <li key={step} className="flex flex-col gap-1.5">
                    <span aria-hidden className="h-14 rounded-lg border" style={{ background: `var(--color-${name}-${step})` }} />
                    <span className="type-sign text-text">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="tokens"
        title="Semantic tokens"
        intro={
          <p>
            Components use these and never the ramps. Dark mode, nested previews and the{" "}
            <code>tone-ink</code> scope work by re-assigning them, so components need no{" "}
            <code>dark:</code> classes. The swatches below are live: switch the theme to see them
            change.
          </p>
        }
      >
        <SpecTable
          head={["Token", "Live", "Light", "Dark", "Use"]}
          rows={TOKENS.map(([token, light, dark, use]) => [
            <code key="t">{token}</code>,
            <span
              key="s"
              aria-hidden
              className="block h-8 w-14 rounded-md border border-border-strong"
              style={{ background: `var(--color-${token})` }}
            />,
            light,
            dark,
            use,
          ])}
        />
        <Example
          title="Tokens survive every scope"
          description="The same markup in the page, forced light, forced dark and tone-ink. Use the toolbar."
          code={`<Button variant="primary">Register</Button>
<Button>See schedule</Button>
<StatusBadge domain="event" value="registration_open" />
<a className="text-accent-text underline">Tautan</a>`}
        >
          <Button variant="primary">Register</Button>
          <Button>See schedule</Button>
          <StatusBadge domain="event" value="registration_open" />
          <StatusBadge domain="event" value="full" />
          <StatusBadge domain="oprec" value="rejected" />
          <a href="#tokens" className="type-body text-accent-text underline underline-offset-4">Tautan</a>
        </Example>
      </DocSection>

      <DocSection
        id="lines"
        title="Division lines"
        intro={
          <>
            <p>
              Each division owns one line color permanently, keyed by its code. Colors appear only
              in line badges, route lines and station markers, not as text, backgrounds or
              buttons. Set a division with <code>data-line=&quot;humas&quot;</code> on any element;
              network graphics inside it use that line through <code>--line</code>.
            </p>
            <p>
              In light mode every line sits at the same lightness (L ≈ 0.52–0.56) and carries white
              badge text; in dark mode at L ≈ 0.70–0.76 with dark text. Equal lightness means no
              division looks more important than another. BPH shares the brand red: the core board
              is the main line. A ninth division takes the unused hue nearest 320.
            </p>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <LinePanel />
          <LinePanel ink />
        </div>
      </DocSection>

      <DocSection
        id="tone-ink"
        title="Station screen"
        intro={
          <p>
            Add <code>tone-ink</code> to a section to render it as a dark station screen inside a
            light page, as the home page does with the departure board and the network map. Every token
            inside switches to its dark value, line and status colors included. In dark mode it
            lifts one step to <code>beton-900</code> so it still reads as a panel. At most two per
            page, never adjacent.
          </p>
        }
      >
        <section className="tone-ink rounded-xl p-8" data-line="bph">
          <p className="type-kicker text-muted">Upcoming events</p>
          <p className="mt-2 type-heading-lg text-text">Shenzhen Cup 2026</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LineBadge code="depol" />
            <StatusBadge domain="event" value="registration_open" />
            <Button variant="primary" size="sm">Register</Button>
          </div>
        </section>
      </DocSection>

      <DocSection
        id="contrast"
        title="Contrast"
        intro={<p>WCAG 2.2 AA, computed from the values above. Text reaches 4.5:1; control boundaries and graphics reach 3:1.</p>}
      >
        <SpecTable
          head={["Pair", "Light", "Dark"]}
          rows={[
            ["text on bg / surface / surface-raised", "19.12 / 18.15 / 19.12", "18.15 / 15.83 / 12.04"],
            ["muted on bg / surface / surface-strong", "5.74 / 5.45 / 5.14", "8.29 / 7.23 / 5.50"],
            ["border-strong on bg / surface", "3.79 / 3.60", "5.05 / 4.40"],
            ["accent-fg on accent / hover / active", "5.19 / 7.17 / 9.90", "5.19 / 7.17 / 9.90"],
            ["accent-text on bg / surface / accent-subtle", "7.17 / 6.81 / 6.55", "10.20 / 8.89 / 8.98"],
            ["accent-line (graphic) on bg / surface", "3.82 / 3.62", "5.01 / 4.37"],
            ["success-text on bg / subtle", "7.08 / 6.54", "10.71 / 9.08"],
            ["warning-text on bg / subtle", "7.36 / 6.85", "11.97 / 9.84"],
            ["danger-text on bg / subtle", "7.17 / 6.55", "10.20 / 8.98"],
            ["highlight-fg on highlight", "11.97", "11.97"],
            ["exit-fg on exit (exit badge)", "11.97", "11.97"],
          ]}
        />
        <SpecTable
          head={["Line", "Light: badge text / on bg / on surface", "Dark: badge text / on bg / on surface / on surface-strong"]}
          rows={[
            ["bph", "5.19 / 5.19 / 4.92", "6.65 / 6.65 / 5.80 / 4.41"],
            ["danus", "4.61 / 4.61 / 4.37", "8.50 / 8.50 / 7.44 / 5.67"],
            ["depol", "4.96 / 4.96 / 4.71", "8.83 / 8.83 / 7.73 / 5.88"],
            ["humas", "5.54 / 5.54 / 5.26", "7.73 / 7.73 / 6.77 / 5.15"],
            ["it", "5.07 / 5.07 / 4.82", "8.94 / 8.94 / 7.83 / 5.96"],
            ["medkref", "5.63 / 5.63 / 5.35", "7.08 / 7.08 / 6.20 / 4.72"],
            ["pka", "6.06 / 6.06 / 5.76", "7.36 / 7.36 / 6.45 / 4.91"],
            ["sosbud", "6.76 / 6.76 / 6.42", "7.09 / 7.09 / 6.21 / 4.73"],
          ]}
        />
      </DocSection>

      <DocSection id="rules" title="Rules">
        <DoDont
          dont={<p>Several red buttons, red headings or red section backgrounds.</p>}
          doThis={<p>One primary button per screen. Red is the brand line, the current-page marker and links.</p>}
        />
        <DoDont
          dont={<p><code>text-line-humas</code> headings, a HUMAS-blue section, division-colored buttons.</p>}
          doThis={<p>Line colors only on <code>line-badge</code>, <code>route</code> and <code>station</code>. Everything else stays neutral.</p>}
        />
        <DoDont
          dont={<p>A yellow “Buy now” button, or a yellow badge on a link inside the app.</p>}
          doThis={<p>Exit yellow only on <code>exit-badge</code>, and the badge only on links that leave the app.</p>}
        />
        <DoDont
          dont={<p><code>bg-red-600</code>, <code>text-gray-500</code>, <code>bg-merah-600</code>, <code>text-[#D61E17]</code>.</p>}
          doThis={<p><code>bg-accent</code>, <code>text-muted</code>, <code>text-accent-text</code>. Only semantic tokens survive dark mode and <code>tone-ink</code>.</p>}
        />
        <DoDont
          dont={<p>A colored dot alone to show a division or a status.</p>}
          doThis={<p>Pair color with the code (<code>HUMAS</code>) or words (“Registration open”). Roughly 5–8% of men have some color-vision deficiency.</p>}
        />
        <Prose>
          <p>
            Danger shares the red family, so an error always comes with an icon and a message, and a
            destructive button is an outlined tint, never a solid red fill. No gradients,
            transparent text or tinted photos.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
