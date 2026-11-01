import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"

/*
 * Station and route primitives. Color comes from --line: brand red by
 * default, or a division via `line` / data-line on the element or an ancestor.
 * Drawn lines are decoration (aria-hidden); the <ol> carries the meaning, and
 * every station has a visible label.
 *
 * Geometry is fixed: routes run horizontally or vertically, stations sit
 * centered on them, labels sit below horizontal routes and right of vertical
 * ones, and line weight is constant.
 */

export type StopState = "upcoming" | "passed" | "here"

/** A free-standing horizontal route line. */
function Route({
  draw = false,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  /** Scroll-linked draw-in. Only for routes below the fold. */
  draw?: boolean
}) {
  return (
    <span
      aria-hidden
      data-slot="route"
      className={cn("route", draw && "route-draw", className)}
      {...props}
    />
  )
}

/** A free-standing vertical route line. */
function RouteV({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="route-v"
      className={cn("route-v", className)}
      {...props}
    />
  )
}

/** A stop: upcoming (ring), passed (filled) or here (filled with a halo). */
function Station({
  state = "upcoming",
  className,
  ...props
}: React.ComponentProps<"span"> & { state?: StopState }) {
  return (
    <span
      aria-hidden
      data-slot="station"
      data-state={state}
      className={cn(
        "station relative z-10 transition-colors duration-(--duration-base) ease-out",
        state === "passed" && "station-passed",
        state === "here" && "station-here",
        className
      )}
      {...props}
    />
  )
}

/** Where lines meet: a joint event, or a campus served by many divisions. */
function Interchange({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="interchange"
      className={cn("station-interchange relative z-10", className)}
      {...props}
    />
  )
}

/**
 * An ordered route of stops. Each RouteStop draws the segment to the next
 * stop, so stops can carry their own state, color or terminus.
 */
function RouteList({
  orientation = "horizontal",
  className,
  ...props
}: React.ComponentProps<"ol"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <ol
      data-slot="route-list"
      data-orientation={orientation}
      className={cn(
        "group/route flex [--route-gap:--spacing(8)]",
        // Room for the "here" halo (6px outside the station), so a scrolling
        // or overflow-hidden parent never clips it.
        orientation === "vertical" ? "flex-col py-1.5 ps-1.5" : "flex-row items-start py-1.5",
        className
      )}
      {...props}
    />
  )
}

// Tailwind only generates classes it can read in full, so the orientation
// variants are spelled out rather than built from a prefix.
const stopClasses = [
  "group-data-[orientation=horizontal]/route:flex-1 group-data-[orientation=horizontal]/route:basis-0 group-data-[orientation=horizontal]/route:flex-col group-data-[orientation=horizontal]/route:items-center group-data-[orientation=horizontal]/route:gap-3 group-data-[orientation=horizontal]/route:px-1 group-data-[orientation=horizontal]/route:text-center",
  "group-data-[orientation=vertical]/route:gap-4 group-data-[orientation=vertical]/route:pb-(--route-gap) group-data-[orientation=vertical]/route:last:pb-0",
]
const segmentClasses = [
  "group-data-[orientation=horizontal]/route:route group-data-[orientation=horizontal]/route:top-1.5 group-data-[orientation=horizontal]/route:left-1/2 group-data-[orientation=horizontal]/route:w-full",
  "group-data-[orientation=vertical]/route:route-v group-data-[orientation=vertical]/route:top-[9px] group-data-[orientation=vertical]/route:left-1.5 group-data-[orientation=vertical]/route:h-full",
]
const drawClasses = "group-data-[orientation=horizontal]/route:route-draw"
const terminusClasses = [
  "group-data-[orientation=horizontal]/route:top-0 group-data-[orientation=horizontal]/route:left-[calc(50%+16px)] group-data-[orientation=horizontal]/route:h-[18px] group-data-[orientation=horizontal]/route:w-1.5",
  "group-data-[orientation=vertical]/route:top-[25px] group-data-[orientation=vertical]/route:left-0 group-data-[orientation=vertical]/route:h-1.5 group-data-[orientation=vertical]/route:w-[18px]",
]
const extendClasses = [
  "group-data-[orientation=horizontal]/route:route group-data-[orientation=horizontal]/route:top-1.5 group-data-[orientation=horizontal]/route:left-1/2 group-data-[orientation=horizontal]/route:w-[calc(50%+2rem)]",
  "group-data-[orientation=vertical]/route:route-v group-data-[orientation=vertical]/route:top-[9px] group-data-[orientation=vertical]/route:left-1.5 group-data-[orientation=vertical]/route:h-[calc(100%+2.5rem)]",
]
const labelClasses = "group-data-[orientation=vertical]/route:pt-px"

function RouteStop({
  state = "upcoming",
  current,
  line,
  end = false,
  terminus = false,
  dim = false,
  extend,
  draw = false,
  marker,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"li">, "aria-current"> & {
  state?: StopState
  /** Sets aria-current on the stop that is "here". */
  current?: "step" | "page" | "location" | boolean
  /** Division line for this stop and the segment after it. */
  line?: LineCode
  /** No segment after this stop: the route stops here. */
  end?: boolean
  /** A danger bar across the line after this stop (oprec: not selected). */
  terminus?: boolean
  /** Gray out the station: a stop the route no longer reaches. */
  dim?: boolean
  /** Continue a short way in a division color (oprec: accepted). */
  extend?: LineCode
  /** Scroll-linked draw-in for the segment (horizontal, below the fold). */
  draw?: boolean
  /** Replaces the station marker, e.g. with an Interchange. */
  marker?: React.ReactNode
}) {
  return (
    <li
      data-slot="route-stop"
      data-line={line}
      aria-current={current}
      className={cn(
        "group/stop relative flex min-w-0",
        stopClasses,
        dim && "[--line:var(--color-border-strong)]",
        className
      )}
      {...props}
    >
      {!end && (
        <span
          aria-hidden
          data-slot="route-segment"
          className={cn(
            "absolute group-last/stop:invisible",
            segmentClasses,
            draw && drawClasses
          )}
        />
      )}
      {terminus && (
        <span
          aria-hidden
          data-slot="route-terminus"
          className={cn("absolute z-10 rounded-full bg-danger", terminusClasses)}
        />
      )}
      {extend && (
        <span
          aria-hidden
          data-slot="route-extend"
          data-line={extend}
          className={cn("absolute", extendClasses)}
        />
      )}
      {marker ?? <Station state={state} />}
      <div
        data-slot="route-stop-label"
        className={cn("flex min-w-0 flex-col gap-1", labelClasses)}
      >
        {children}
      </div>
    </li>
  )
}

export { Route, RouteV, Station, Interchange, RouteList, RouteStop }
