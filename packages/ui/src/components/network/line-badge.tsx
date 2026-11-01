import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { getDivision, type LineCode } from "@ppitsz/ui/lib/network"

/**
 * Line badge: the division code in its line color, like a metro line
 * bullet. The code is always visible; screen readers hear the full division
 * name, which is Indonesian (a proper name, ADR 0007). Never a button: wrap badges in a FilterChip to filter by them.
 */
function LineBadge({
  code,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  code: LineCode
}) {
  const division = getDivision(code)
  const name = division.name
  return (
    <span
      data-slot="line-badge"
      data-line={code}
      className={cn("line-badge", className)}
      {...props}
    >
      <abbr title={name} lang="id" aria-hidden>
        {division.badge}
      </abbr>
      <span className="sr-only" lang="id">{name}</span>
    </span>
  )
}

/**
 * Several divisions on one thing. Two or more render as an interchange:
 * badges side by side, joined by a short ink connector.
 */
function LineBadges({
  codes,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  codes: readonly LineCode[]
}) {
  return (
    <span
      data-slot="line-badges"
      className={cn("inline-flex flex-wrap items-center gap-y-1", className)}
      {...props}
    >
      {codes.map((code, i) => (
        <React.Fragment key={code}>
          {i > 0 && (
            <span aria-hidden className="h-1 w-2 bg-text" />
          )}
          <LineBadge code={code} />
        </React.Fragment>
      ))}
    </span>
  )
}

export { LineBadge, LineBadges }
