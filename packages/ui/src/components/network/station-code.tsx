import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"

/**
 * An order or ticket code as a station number: GC-7K3P reads as the prefix
 * in the line color and the number in ink, in a line-colored frame. A code
 * without a prefix (a ticket's K7P3QX) is the frame alone. Screen readers
 * hear the code as written. For the big code under a QR, use TicketCode.
 */
function StationCode({
  code,
  line,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** "GC-7K3P" or "K7P3QX". */
  code: string
  /** The division line. Brand red by default. */
  line?: LineCode
}) {
  const dash = code.indexOf("-")
  const prefix = dash > 0 ? code.slice(0, dash) : null
  const number = dash > 0 ? code.slice(dash + 1) : code
  return (
    <span data-slot="station-code" data-line={line} className={cn("station-code", className)} {...props}>
      {prefix && (
        <span data-part="prefix">
          {prefix}
          <span className="sr-only">-</span>
        </span>
      )}
      <span data-part="number">{number}</span>
    </span>
  )
}

export { StationCode }
