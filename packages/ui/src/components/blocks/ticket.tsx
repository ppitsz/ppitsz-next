import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import type { LineCode } from "@ppitsz/ui/lib/network"

/*
 * Ticket: a metro ticket for an event ticket (Forms) or an order to collect
 * (Shop). The body is a tone-ink card on the organizing division's line:
 * what it is for, whose it is, and its fields in boarding-pass cells. The stub
 * tears off along a perforation with a notch at each end and is always light,
 * so the QR stays black on white for scanners in every mode.
 *
 * The notches are the only cut corners in the system, and only tickets have
 * them. A canceled ticket keeps its body and puts the reason in the stub
 * instead of the QR.
 */

function Ticket({
  dispense = false,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  /**
   * Comes out of the machine: slides down once as it appears. Only for a
   * ticket that is new this moment (just signed up, payment just checked),
   * never when the page is opened again.
   */
  dispense?: boolean
}) {
  return (
    <section
      data-slot="ticket"
      className={cn(
        "@container flex w-full flex-col",
        dispense && "animate-dispense",
        "[&>[data-slot=ticket-body]:not(:last-child)]:rounded-b-none [&>[data-slot=ticket-body]:not(:last-child)]:ticket-notch-b",
        className
      )}
      {...props}
    />
  )
}

function TicketBody({
  line,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** The organizing division. Set here, inside the ink, so it takes its dark value. */
  line?: LineCode
}) {
  return (
    <div
      data-slot="ticket-body"
      data-line={line}
      className={cn("tone-ink flex flex-col gap-5 rounded-xl p-5 @md:p-6", className)}
      {...props}
    >
      <span aria-hidden className="route" />
      {children}
    </div>
  )
}

/** The top row: line badges or the ticket type, and the ticket's number. */
function TicketHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-header"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      {...props}
    />
  )
}

function TicketTitle({
  as: Heading = "h2",
  className,
  ...props
}: React.ComponentProps<"h2"> & { as?: "h1" | "h2" | "h3" }) {
  return (
    <Heading
      data-slot="ticket-title"
      className={cn("type-heading-lg text-text", className)}
      {...props}
    />
  )
}

/** The cells: Date, Time, Station, Type … Two across, four from @md. */
function TicketFields({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="ticket-fields"
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 @md:grid-cols-4",
        className
      )}
      {...props}
    />
  )
}

function TicketField({
  label,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div data-slot="ticket-field" className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>
      <dt className="type-kicker text-muted">{label}</dt>
      <dd className="type-sign text-text">{children}</dd>
    </div>
  )
}

/** The tear-off part: the QR and the code, light in every mode. */
function TicketStub({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-stub"
      className={cn(
        // A hairline edge so the light stub still reads as part of the
        // ticket on a light page; the top edge is the dashed perforation.
        "scope-light ticket-notch-t flex flex-col items-center gap-4 rounded-b-xl border-2 border-t-border-strong border-x-border border-b-border bg-bg p-5 text-text [border-top-style:dashed] @md:p-6",
        className
      )}
      {...props}
    />
  )
}

/** The code to read out when the QR won't scan. */
function TicketCode({
  label = "If the QR code won't scan, say this code",
  className,
  children,
  ...props
}: React.ComponentProps<"p"> & { label?: React.ReactNode }) {
  return (
    <p data-slot="ticket-code" className={cn("flex flex-col items-center gap-1 text-center", className)} {...props}>
      <span className="type-caption text-muted">{label}</span>
      <span className="type-numeral text-text">{children}</span>
    </p>
  )
}

export {
  Ticket,
  TicketBody,
  TicketHeader,
  TicketTitle,
  TicketFields,
  TicketField,
  TicketStub,
  TicketCode,
}
