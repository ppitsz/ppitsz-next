import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { controlClasses } from "@ppitsz/ui/components/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlClasses,
        "flex field-sizing-content min-h-28 py-2.5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
