import * as React from "react"
import { ArrowUpIcon, ExclamationMarkIcon, XIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"

/*
 * Gate: the answer to a scan, read at arm's length like a ticket gate's
 * display. Go is the green arrow through, hold is "check before you let them
 * in" (already checked in, already picked up), stop is the red cross. The
 * symbol, the title and the color always agree, and the title says it in
 * words. One gate at a time, in place of the camera, with the next scan as
 * the primary button.
 */

export type GateVerdict = "go" | "hold" | "stop"

const VERDICTS = {
  go: {
    Icon: ArrowUpIcon,
    panel: "border-success bg-success-subtle",
    symbol: "bg-success-text",
  },
  hold: {
    Icon: ExclamationMarkIcon,
    panel: "border-warning bg-warning-subtle",
    symbol: "bg-warning-text",
  },
  stop: {
    Icon: XIcon,
    panel: "border-danger bg-danger-subtle",
    symbol: "bg-danger-text",
  },
} as const

function Gate({
  verdict,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { verdict: GateVerdict }) {
  const { Icon, panel, symbol } = VERDICTS[verdict]
  return (
    <section
      data-slot="gate"
      data-verdict={verdict}
      role="status"
      aria-live="assertive"
      className={cn(
        "@container flex w-full flex-col gap-5 rounded-xl border-2 p-5 animate-fade @md:p-6",
        panel,
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        data-slot="gate-symbol"
        className={cn(
          "inline-flex size-20 shrink-0 items-center justify-center rounded-xl text-bg @md:size-24",
          symbol
        )}
      >
        <Icon weight="bold" className="size-12 @md:size-14" />
      </span>
      {children}
    </section>
  )
}

/** "Checked in", "Already checked in", "Not valid today". */
function GateTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 data-slot="gate-title" className={cn("type-display-lg text-text", className)} {...props} />
  )
}

/** Whose ticket or order it is: the name, then type and code. */
function GateHolder({
  name,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { name: React.ReactNode }) {
  return (
    <div data-slot="gate-holder" className={cn("flex flex-col gap-1", className)} {...props}>
      <p className="type-heading-lg text-text">{name}</p>
      {children && <p className="type-body text-muted">{children}</p>}
    </div>
  )
}

/** Why, and what to do: "Checked in at 18:42 by Dimas. If it's someone else, check their ID." */
function GateDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="gate-description" className={cn("max-w-[60ch] type-body text-text", className)} {...props} />
  )
}

function GateActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="gate-actions" className={cn("flex flex-wrap gap-3", className)} {...props} />
  )
}

export { Gate, GateTitle, GateHolder, GateDescription, GateActions }
