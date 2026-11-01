import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * The centered content column: about 76rem wide plus side margins.
 * Full-bleed bands (tone-ink, photo bands) span the viewport and put a
 * Container inside. `narrow` is the ~48rem column for forms, login and FAQ.
 */
function Container({
  narrow = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { narrow?: boolean }) {
  return (
    <div
      data-slot="container"
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-[48rem]" : "max-w-[76rem]",
        className
      )}
      {...props}
    />
  )
}

export { Container }
