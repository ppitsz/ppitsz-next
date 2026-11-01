"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"

/** Checked fills with the accent, as a native checkbox with accent-color would. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[5px] border-2 border-border-strong bg-surface-raised text-accent-fg",
        "transition-colors duration-(--duration-fast) ease-out outline-none hover:border-text",
        "after:absolute after:-inset-x-3 after:-inset-y-3",
        "data-checked:border-accent data-checked:bg-accent data-checked:hover:border-accent-hover data-checked:hover:bg-accent-hover",
        "aria-invalid:border-danger",
        "data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-surface data-disabled:text-subtle",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-3.5"
      >
        <CheckIcon weight="bold" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
