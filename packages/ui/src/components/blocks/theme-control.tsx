"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"

/*
 * Theme control: one button that steps System → Light → Dark. "System"
 * clears the forced theme so the CSS follows prefers-color-scheme;
 * "Light"/"Dark" force it on <html data-theme>. next-themes stores the
 * choice and prevents a flash.
 */

type Theme = "system" | "light" | "dark"

const THEMES: Record<Theme, { label: string; icon: typeof SunIcon; next: Theme }> = {
  system: { label: "System", icon: DesktopIcon, next: "light" },
  light: { label: "Light", icon: SunIcon, next: "dark" },
  dark: { label: "Dark", icon: MoonIcon, next: "system" },
}

function isTheme(value: string | undefined): value is Theme {
  return value === "system" || value === "light" || value === "dark"
}

function ThemeControl({
  className,
  iconOnly = false,
}: {
  className?: string
  /** Show only the icon, for tight slots such as the header's account slot. */
  iconOnly?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const current = mounted && isTheme(theme) ? theme : "system"
  const { label: currentLabel, icon: Icon, next } = THEMES[current]
  const label = `Theme: ${currentLabel}`

  return (
    <Button
      size={iconOnly ? "icon-sm" : "sm"}
      className={className}
      aria-label={iconOnly ? label : undefined}
      title={`${label}. Switch to ${THEMES[next].label.toLowerCase()}.`}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden />
      {!iconOnly && label}
    </Button>
  )
}

export { ThemeControl }
