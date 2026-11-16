"use client"

import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import {
  RECRUITMENT_REJECTED_STAGE,
  RECRUITMENT_STAGES,
  type LineCode,
} from "@ppitsz/ui/lib/network"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { RouteList, RouteStop, type StopState } from "@ppitsz/ui/components/network/route"

/*
 * Route tracker: the applicant's journey through recruitment as a route.
 * Horizontal from lg, vertical on phones. Passed stations show a short result
 * line, the current one says what to do next, upcoming ones show their date.
 * Rejected: the route stops at that station with a danger terminus and later
 * stations gray out. Accepted: the route continues a short way in the new
 * division's color — the applicant has transferred onto their line.
 */

export interface RouteTrackerStage {
  label: string
  /** "Sep 21" — shown under upcoming stations, or with a result. */
  date?: string
  /** Passed: the result ("Passed · Sep 21"). Here: what to do next. */
  note?: string
}

export interface RouteTrackerProps {
  /** Defaults to the four recruitment stages. */
  stages?: RouteTrackerStage[]
  /** 0–3, or 4 when rejected (as in the recruitment data). */
  currentStage: number
  /** With currentStage 4: the stage the applicant stopped at. */
  rejectedAtStage?: number
  /** Accepted onto this division's line. */
  acceptedLine?: LineCode
  /** The stage whose panel is open below the tracker. */
  selectedStage?: number
  /** Makes passed and current stations pressable. */
  onSelectStage?: (stage: number) => void
  hereLabel?: string
  className?: string
  "aria-label"?: string
}

interface ResolvedStop {
  index: number
  stage: RouteTrackerStage
  state: StopState
  isCurrent: boolean
  rejectedHere: boolean
  acceptedHere: boolean
  dim: boolean
}

function resolveStops({
  stages,
  currentStage,
  rejectedAtStage,
  acceptedLine,
}: Required<Pick<RouteTrackerProps, "stages" | "currentStage">> &
  Pick<RouteTrackerProps, "rejectedAtStage" | "acceptedLine">): ResolvedStop[] {
  const rejected = currentStage === RECRUITMENT_REJECTED_STAGE && rejectedAtStage !== undefined
  const last = stages.length - 1
  const here = rejected ? rejectedAtStage! : acceptedLine ? last : currentStage
  return stages.map((stage, index) => {
    const isCurrent = index === here
    const state: StopState = isCurrent ? "here" : index < here ? "passed" : "upcoming"
    return {
      index,
      stage,
      state,
      isCurrent,
      rejectedHere: rejected && isCurrent,
      acceptedHere: !!acceptedLine && isCurrent,
      dim: rejected && index > here,
    }
  })
}

function RouteTracker({
  stages,
  currentStage,
  rejectedAtStage,
  acceptedLine,
  selectedStage,
  onSelectStage,
  hereLabel = "You are here",
  className,
  "aria-label": ariaLabel = "Application progress",
}: RouteTrackerProps) {
  const resolvedStages = stages ?? RECRUITMENT_STAGES.map((s) => ({ label: s.label }))
  const stops = resolveStops({
    stages: resolvedStages,
    currentStage,
    rejectedAtStage,
    acceptedLine,
  })

  const renderStops = () =>
    stops.map((stop) => {
      const pressable = !!onSelectStage && stop.state !== "upcoming"
      const label = (
        <span
          className={cn(
            "type-sign",
            stop.dim || stop.state === "upcoming" ? "text-muted" : "text-text"
          )}
        >
          {stop.stage.label}
        </span>
      )
      return (
        <RouteStop
          key={stop.index}
          state={stop.state}
          current={stop.isCurrent ? "step" : undefined}
          dim={stop.dim}
          end={stop.rejectedHere}
          terminus={stop.rejectedHere}
          extend={stop.acceptedHere ? acceptedLine : undefined}
        >
          {pressable ? (
            <button
              type="button"
              aria-pressed={selectedStage === stop.index}
              onClick={() => onSelectStage!(stop.index)}
              className="rounded-sm underline-offset-4 hover:underline aria-pressed:underline aria-pressed:decoration-2"
            >
              {label}
            </button>
          ) : (
            label
          )}
          {stop.isCurrent && !stop.rejectedHere && !stop.acceptedHere && (
            <span className="type-kicker text-accent-text">{hereLabel}</span>
          )}
          {stop.rejectedHere && (
            <StatusBadge domain="recruitment" value="rejected" />
          )}
          {stop.acceptedHere && acceptedLine && (
            <span className="flex flex-wrap items-center gap-2 group-data-[orientation=horizontal]/route:justify-center">
              <StatusBadge domain="recruitment" value="accepted" />
              <LineBadge code={acceptedLine} />
            </span>
          )}
          {stop.stage.note && (
            <span className="type-caption text-muted">
              {stop.stage.note}
            </span>
          )}
          {!stop.stage.note && stop.stage.date && (
            <span className="type-caption text-muted">
              {stop.stage.date}
            </span>
          )}
        </RouteStop>
      )
    })

  return (
    <div data-slot="route-tracker" className={cn("@container w-full", className)}>
      <RouteList orientation="vertical" aria-label={ariaLabel} className="@lg:hidden">
        {renderStops()}
      </RouteList>
      <RouteList
        orientation="horizontal"
        aria-label={ariaLabel}
        className="hidden @lg:flex"
      >
        {renderStops()}
      </RouteList>
    </div>
  )
}

export { RouteTracker }
