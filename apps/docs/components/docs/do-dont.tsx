import * as React from "react"
import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"

/** A do / don't pair. Every rule says both what to avoid and what to do. */
export function DoDont({
  dont,
  doThis,
  className,
}: {
  dont: React.ReactNode
  doThis: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="flex flex-col gap-2 rounded-xl border-s-4 border-s-danger bg-danger-subtle p-5">
        <p className="flex items-center gap-2 type-kicker text-danger-text">
          <XIcon weight="bold" aria-hidden className="size-4" />
          Don’t
        </p>
        <div className="type-body-sm text-text [&_code]:rounded-md [&_code]:bg-bg [&_code]:px-1.5 [&_code]:py-0.5">
          {dont}
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border-s-4 border-s-success bg-success-subtle p-5">
        <p className="flex items-center gap-2 type-kicker text-success-text">
          <CheckIcon weight="bold" aria-hidden className="size-4" />
          Do
        </p>
        <div className="type-body-sm text-text [&_code]:rounded-md [&_code]:bg-bg [&_code]:px-1.5 [&_code]:py-0.5">
          {doThis}
        </div>
      </div>
    </div>
  )
}
