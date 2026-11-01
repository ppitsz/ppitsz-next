import { CircleNotchIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Loading indicator. Decorative by default: the control's progressive label
 * ("Sending…") carries the state. Pass `label` when the spinner stands alone.
 * Stops under reduced motion (global rule).
 */
function Spinner({
  className,
  label,
  ...props
}: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <CircleNotchIcon
      data-slot="spinner"
      weight="bold"
      {...(label
        ? { role: "status", "aria-label": label }
        : { "aria-hidden": true })}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
