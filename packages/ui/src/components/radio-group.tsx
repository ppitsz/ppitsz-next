"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@ppitsz/ui/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-1", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-surface-raised",
        "transition-colors duration-(--duration-fast) ease-out outline-none hover:border-text",
        "after:absolute after:-inset-x-3 after:-inset-y-3",
        "data-checked:border-accent data-checked:hover:border-accent-hover",
        "aria-invalid:border-danger",
        "data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-surface",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2.5 rounded-full bg-accent group-data-disabled/radio-group-item:bg-subtle"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
