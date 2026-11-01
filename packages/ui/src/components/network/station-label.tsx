import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { getCampus, type CampusId } from "@ppitsz/ui/lib/network"

/**
 * The signature use of three languages: the Latin or Indonesian name in
 * type-sign, with the Chinese name on the line below.
 */
function StationLabel({
  name,
  zh,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  name: React.ReactNode
  zh?: React.ReactNode
}) {
  return (
    <span
      data-slot="station-label"
      className={cn("flex flex-col", className)}
      {...props}
    >
      <span className="type-sign text-text">{name}</span>
      {zh && (
        <span lang="zh-Hans" className="type-caption text-muted">
          {zh}
        </span>
      )}
    </span>
  )
}

/** A campus station label, from the campus id. */
function CampusLabel({
  campus,
  ...props
}: Omit<React.ComponentProps<typeof StationLabel>, "name" | "zh"> & {
  campus: CampusId
}) {
  const c = getCampus(campus)
  return <StationLabel name={c.name} zh={c.zh} {...props} />
}

export { StationLabel, CampusLabel }
