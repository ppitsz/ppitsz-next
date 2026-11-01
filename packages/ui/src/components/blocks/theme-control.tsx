"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { cn } from "@ppitsz/ui/lib/utils"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"

/*
 * Theme control: a native select. "Follow system" clears the forced
 * theme so the CSS follows prefers-color-scheme; "Light"/"Dark" force it on
 * <html data-theme>. next-themes stores the choice and prevents a flash.
 */

function ThemeControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const id = React.useId()

  React.useEffect(() => setMounted(true), [])

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <label htmlFor={id} className="type-ui text-text">
        Theme
      </label>
      <NativeSelect
        id={id}
        size="sm"
        className="w-auto"
        value={mounted ? (theme ?? "system") : "system"}
        onChange={(e) => setTheme(e.target.value)}
      >
        <NativeSelectOption value="system">Follow system</NativeSelectOption>
        <NativeSelectOption value="light">Light</NativeSelectOption>
        <NativeSelectOption value="dark">Dark</NativeSelectOption>
      </NativeSelect>
    </div>
  )
}

export { ThemeControl }
