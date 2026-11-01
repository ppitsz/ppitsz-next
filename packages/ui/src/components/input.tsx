import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Shared control styling for Input, Textarea and NativeSelect.
 * Invalid thickens the border with an inset shadow, so layout never shifts.
 */
const controlClasses = [
  "w-full min-w-0 rounded-lg border border-border-strong bg-surface-raised px-3.5 type-body text-text",
  "transition-colors duration-(--duration-fast) ease-out outline-none",
  "hover:border-text placeholder:text-muted",
  "read-only:bg-surface",
  "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface disabled:text-subtle",
  "aria-invalid:border-danger aria-invalid:shadow-[inset_0_0_0_1px_var(--color-danger)]",
]

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "h-12",
        "file:mr-3 file:inline-flex file:h-8 file:rounded-full file:border-0 file:bg-surface-strong file:px-3 file:type-ui file:text-text",
        className
      )}
      {...props}
    />
  )
}

export { Input, controlClasses }
