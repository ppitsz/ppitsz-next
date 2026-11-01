"use client"

import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 type-ui text-text select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-subtle peer-disabled:cursor-not-allowed peer-disabled:text-subtle",
        className
      )}
      {...props}
    />
  )
}

export { Label }
