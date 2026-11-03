import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { RouteList, RouteStop, type StopState } from "@ppitsz/ui/components/network/route"

/*
 * Strip map: the route map above a train's doors. A short, always horizontal
 * route (an order's Order › Pay › Verify › Pick up, a ticket's days) under a
 * reading line that says what comes next: "Next  Verify · Towards  Pick up".
 * Arrived: every stop passed. Stopped: the route ends at the current stop
 * with a danger terminus and later stops gray out (canceled, expired).
 * With `screen` it sits in a tone-ink band, as in the train.
 */

export interface StripMapStop {
  label: string
  /** One short line under the stop: "Sat, Nov 14", "Paid 14:02". */
  note?: string
}

export type StripMapState = "running" | "arrived" | "stopped"

export interface StripMapProps {
  stops: readonly StripMapStop[]
  /** Index of the stop it is at. */
  current: number
  state?: StripMapState
  /** The division line it runs on. Brand red by default. */
  line?: LineCode
  /** Shown at the end of the reading line, e.g. a StatusBadge. */
  status?: React.ReactNode
  /** In a tone-ink band, like the screen in a train. */
  screen?: boolean
  labels?: Partial<typeof LABELS>
  className?: string
  "aria-label"?: string
}

const LABELS = {
  next: "Next",
  now: "Now at",
  towards: "Towards",
  arrived: "Arrived",
  stopped: "Stopped at",
}

function stateOf(i: number, current: number, state: StripMapState): StopState {
  if (state === "arrived" || i < current) return "passed"
  return i === current ? "here" : "upcoming"
}

function StripMap({
  stops,
  current,
  state = "running",
  line,
  status,
  screen = false,
  labels,
  className,
  "aria-label": ariaLabel = "Progress",
}: StripMapProps) {
  const copy = { ...LABELS, ...labels }
  const last = stops.length - 1
  const at = Math.min(Math.max(current, 0), last)
  const next = state === "running" && at < last ? stops[at + 1] : undefined

  const [kicker, place] =
    state === "arrived"
      ? [copy.arrived, stops[last]]
      : state === "stopped"
        ? [copy.stopped, stops[at]]
        : next
          ? [copy.next, next]
          : [copy.now, stops[at]]

  return (
    <div
      data-slot="strip-map"
      data-state={state}
      className={cn(
        "flex w-full flex-col gap-4",
        screen && "tone-ink rounded-xl px-4 pt-4 pb-3 @md:px-5",
        className
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="flex items-baseline gap-2">
          <span className="type-kicker text-muted">{kicker}</span>
          <span className="type-sign text-text">{place?.label}</span>
        </span>
        {next && at + 1 < last && (
          <span className="flex items-baseline gap-2">
            <span className="type-kicker text-muted">{copy.towards}</span>
            <span className="type-sign text-text">{stops[last]?.label}</span>
          </span>
        )}
        {status && <span className="ms-auto self-center">{status}</span>}
      </p>
      <div data-line={line}>
        <RouteList orientation="horizontal" aria-label={ariaLabel}>
          {stops.map((stop, i) => {
            const stopState = stateOf(i, at, state)
            const here = stopState === "here"
            const stoppedHere = state === "stopped" && i === at
            return (
              <RouteStop
                key={i}
                state={stopState}
                current={here ? "step" : undefined}
                end={stoppedHere}
                terminus={stoppedHere}
                dim={state === "stopped" && i > at}
              >
                <span className={cn("type-caption", here ? "text-text" : "text-muted")}>
                  {stop.label}
                </span>
                {stop.note && <span className="type-caption text-muted">{stop.note}</span>}
              </RouteStop>
            )
          })}
        </RouteList>
      </div>
    </div>
  )
}

export { StripMap }
