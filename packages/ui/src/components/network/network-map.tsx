import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { DIVISIONS, getDivision, type LineCode } from "@ppitsz/ui/lib/network"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { Station } from "@ppitsz/ui/components/network/route"

/*
 * Network map: the whole organization as a diagram, generated from data.
 * Every line meets at the central interchange: BPH, the main line, runs
 * south; the other lines leave it at 0°, 45° and 90° angles. Each ends in a
 * station labeled with the division and its member count. Place it in a
 * tone-ink band.
 *
 * Lines and stations are SVG; labels are HTML positioned over it, so they
 * keep their real type size however wide the map is drawn. The drawing is
 * decoration (aria-hidden, not focusable). The <ol> below it is the
 * accessible, keyboard-reachable version, and doubles as the phone layout: a
 * stack of short horizontal routes.
 */

export interface NetworkMapDivision {
  code: LineCode
  members: number
  /** Link to the division's section, e.g. "#humas". */
  href: string
}

// One reach for both axes, so diagonals are true 45° lines. The side margins
// leave room for a label beside every outer station at the narrowest width
// the drawing is shown (a 36rem container).
const W = 1100
const H = 600
const CX = W / 2
const CY = 260
const REACH = 200

type Direction = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
/** Where a label sits relative to its end station. */
type Placement = "right" | "left" | "below-start" | "below-end" | "below"

// Short names take the vertical lines, long names the outer ones, so no
// label crosses a route. BPH, the main line, runs south.
const LAYOUT: Record<LineCode, { dir: Direction; label: Placement }> = {
  // The BPH terminus label sits centered below it, clear of both diagonals.
  bph: { dir: { dx: 0, dy: 1 }, label: "below" },
  danus: { dir: { dx: 0, dy: -1 }, label: "right" },
  sosbud: { dir: { dx: 1, dy: -1 }, label: "right" },
  humas: { dir: { dx: 1, dy: 0 }, label: "below-start" },
  it: { dir: { dx: 1, dy: 1 }, label: "right" },
  medkref: { dir: { dx: -1, dy: 1 }, label: "left" },
  pka: { dir: { dx: -1, dy: 0 }, label: "below-end" },
  depol: { dir: { dx: -1, dy: -1 }, label: "left" },
}

const PLACEMENT_CLASSES: Record<Placement, string> = {
  right: "translate-x-5 -translate-y-1/2 text-left",
  left: "-translate-x-[calc(100%+1.25rem)] -translate-y-1/2 text-right",
  "below-start": "-translate-x-2 translate-y-5 text-left",
  "below-end": "-translate-x-[calc(100%-0.5rem)] translate-y-5 text-right",
  below: "-translate-x-1/2 translate-y-5 text-center",
}

function NetworkMap({
  divisions,
  membersLabel = (n) => `${formatNumber(n)} ${n === 1 ? "member" : "members"}`,
  linkAs,
  className,
  "aria-label": ariaLabel = "Divisions",
}: {
  divisions: NetworkMapDivision[]
  membersLabel?: (members: number) => string
  /** Link component for the list, e.g. NextLink. */
  linkAs?: React.ElementType
  className?: string
  "aria-label"?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const ordered = DIVISIONS.map((d) => divisions.find((x) => x.code === d.code)).filter(
    (d): d is NetworkMapDivision => d !== undefined
  )
  const lines = ordered.map((d) => {
    const { dir, label } = LAYOUT[d.code]
    return { ...d, label, x: CX + dir.dx * REACH, y: CY + dir.dy * REACH }
  })

  return (
    <div data-slot="network-map" className={cn("@container flex flex-col gap-10", className)}>
      <div aria-hidden className="relative hidden w-full @xl:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg focusable="false" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
          {lines.map((d) => (
            <g key={d.code} data-line={d.code}>
              <line
                x1={CX}
                y1={CY}
                x2={d.x}
                y2={d.y}
                strokeWidth={6}
                strokeLinecap="round"
                style={{ stroke: "var(--line)" }}
              />
              <circle
                cx={d.x}
                cy={d.y}
                r={9}
                strokeWidth={4}
                style={{ stroke: "var(--line)", fill: "var(--line)" }}
              />
            </g>
          ))}
          {/* The central interchange where every line meets */}
          <rect
            x={CX - 26}
            y={CY - 13}
            width={52}
            height={26}
            rx={13}
            strokeWidth={4}
            style={{ fill: "var(--color-bg)", stroke: "var(--color-text)" }}
          />
        </svg>
        {lines.map((d) => (
          <span
            key={d.code}
            className={cn(
              "absolute flex w-max max-w-40 flex-col",
              PLACEMENT_CLASSES[d.label]
            )}
            style={{ left: `${(d.x / W) * 100}%`, top: `${(d.y / H) * 100}%` }}
          >
            <span className="type-sign text-text">{getDivision(d.code).name}</span>
            <span className="type-caption text-muted">{membersLabel(d.members)}</span>
          </span>
        ))}
      </div>

      <ol
        aria-label={ariaLabel}
        className="flex flex-col gap-5 @xl:grid @xl:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] @xl:gap-x-6 @xl:gap-y-4"
      >
        {ordered.map((d) => {
          const division = getDivision(d.code)
          return (
            <li key={d.code} data-line={d.code} className="flex items-center gap-3">
              <LineBadge code={d.code} className="shrink-0" />
              <span aria-hidden className="relative flex w-12 shrink-0 items-center @xl:hidden">
                <span className="route absolute inset-x-0" />
                <Station state="passed" className="ml-auto" />
              </span>
              <span className="flex min-w-0 flex-col">
                <Link
                  href={d.href}
                  className="type-sign text-text underline-offset-4 hover:underline"
                >
                  {division.name}
                </Link>
                <span className="type-caption text-muted">{membersLabel(d.members)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { NetworkMap }
