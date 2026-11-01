"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { CheckIcon } from "@phosphor-icons/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * A pressable on/off control (`aria-pressed`). `chip` is the filter
 * chip: a capsule that fills with ink when pressed. `quiet` is for toolbar
 * icon toggles.
 */
const toggleVariants = cva(
  [
    "group/toggle inline-flex items-center justify-center gap-1.5 rounded-full type-ui whitespace-nowrap select-none",
    "transition-colors duration-(--duration-fast) ease-out",
    "disabled:pointer-events-none disabled:text-subtle",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        chip: "border border-border-strong bg-transparent text-text not-data-pressed:hover:bg-surface-strong data-pressed:border-text data-pressed:bg-text data-pressed:text-bg",
        quiet:
          "bg-transparent text-text hover:bg-surface-strong data-pressed:bg-surface-strong",
      },
      size: {
        sm: "h-9 min-w-9 px-3.5",
        md: "h-11 min-w-11 px-4",
      },
    },
    defaultVariants: {
      variant: "chip",
      size: "sm",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * Filter chip: a toggle with the leading Check that appears when pressed.
 * To filter by division, put a LineBadge inside: the chip fills with ink like
 * any other, and the badge keeps its line color.
 */
function FilterChip({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Toggle>, "variant">) {
  return (
    <Toggle variant="chip" {...props}>
      <CheckIcon
        weight="bold"
        aria-hidden
        className="hidden group-data-pressed/toggle:block"
      />
      {children}
    </Toggle>
  )
}

/** Wraps filter chips in a labeled group. Chips filter instantly. */
function FilterChipGroup({
  className,
  ...props
}: React.ComponentProps<"div"> & { "aria-label": string }) {
  return (
    <div
      role="group"
      data-slot="filter-chip-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants, FilterChip, FilterChipGroup }
