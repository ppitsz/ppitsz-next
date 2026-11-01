"use client"

import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { Toggle } from "@ppitsz/ui/components/toggle"

type Mode = "page" | "light" | "dark" | "ink"

const MODES: { value: Mode; label: string }[] = [
  { value: "page", label: "Page" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "ink", label: "Ink" },
]

/**
 * A live example frame. The toolbar re-scopes the tokens on the frame only:
 * light and dark set data-theme, ink adds tone-ink. Components need no code
 * for any of them.
 */
export function PreviewFrame({
  children,
  lang = "id",
  layout = "row",
  label,
  defaultMode = "page",
  className,
}: {
  children: React.ReactNode
  /** Language of the example content. Example copy is Indonesian. */
  lang?: string
  layout?: "row" | "stack" | "block"
  label?: string
  defaultMode?: Mode
  className?: string
}) {
  const [mode, setMode] = React.useState<Mode>(defaultMode)
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <span className="type-kicker text-muted">{label ?? "Preview"}</span>
        <div role="group" aria-label="Preview theme" className="flex gap-1">
          {MODES.map((m) => (
            <Toggle
              key={m.value}
              variant="quiet"
              size="sm"
              pressed={mode === m.value}
              onPressedChange={() => setMode(m.value)}
              className="h-8 min-w-0 px-3"
            >
              {m.label}
            </Toggle>
          ))}
        </div>
      </div>
      <div
        lang={lang}
        data-theme={mode === "light" || mode === "dark" ? mode : undefined}
        className={cn(
          "bg-bg p-6 text-text sm:p-10",
          mode === "ink" && "tone-ink",
          layout === "row" && "flex flex-wrap items-center gap-4",
          layout === "stack" && "flex flex-col items-start gap-6",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
