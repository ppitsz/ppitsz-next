import * as React from "react"
import { CaretDownIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import { controlClasses } from "@ppitsz/ui/components/input"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "md"
}

/**
 * Select. Always native: correct keyboard, screen-reader and mobile
 * pickers, and it follows color-scheme in dark mode. The first option is an
 * empty prompt ("Choose a campus"). Multi-select is a checkbox group instead.
 */
function NativeSelect({ className, size = "md", ...props }: NativeSelectProps) {
  return (
    <div
      className={cn("group/native-select relative w-full", className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          controlClasses,
          "h-12 appearance-none pr-11 data-[size=sm]:h-9 data-[size=sm]:pr-9 data-[size=sm]:type-body-sm"
        )}
        {...props}
      />
      <CaretDownIcon
        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted select-none group-has-[select:disabled]/native-select:text-subtle group-data-[size=sm]/native-select:right-2.5 group-data-[size=sm]/native-select:size-4"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
