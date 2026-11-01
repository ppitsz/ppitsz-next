import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { CAMPUSES, getCampus, type CampusId } from "@ppitsz/ui/lib/network"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { StationLabel } from "@ppitsz/ui/components/network/station-label"

/*
 * L1 campus line: the home hero's red route with a station per campus and its
 * member count — the organization's reach, stated in plain data. Horizontal
 * from lg, vertical below. It sits above the fold, so it never uses
 * route-draw (a half-drawn line on load reads as broken).
 */

export interface CampusCount {
  campus: CampusId
  members: number
}

function CampusLine({
  campuses = CAMPUSES.map((c) => ({ campus: c.id, members: 0 })),
  membersLabel = (n) => `${formatNumber(n)} members`,
  className,
  "aria-label": ariaLabel = "Campuses",
}: {
  campuses?: CampusCount[]
  membersLabel?: (members: number) => string
  className?: string
  "aria-label"?: string
}) {
  const renderStops = () =>
    campuses.map(({ campus, members }) => {
      const c = getCampus(campus)
      return (
        <RouteStop key={campus} state="passed">
          <StationLabel name={c.name} zh={c.zh} />
          <span className="type-sign text-muted">{membersLabel(members)}</span>
        </RouteStop>
      )
    })

  return (
    <div data-slot="campus-line" className={cn("@container w-full", className)}>
      <RouteList orientation="vertical" aria-label={ariaLabel} className="@xl:hidden">
        {renderStops()}
      </RouteList>
      <RouteList
        orientation="horizontal"
        aria-label={ariaLabel}
        className="hidden @xl:flex"
      >
        {renderStops()}
      </RouteList>
    </div>
  )
}

export { CampusLine }
