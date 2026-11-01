"use client"

import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"

/*
 * Route strip: in-page wayfinding for pages with 3+ h2 sections. Each
 * section heading is a station; passed sections are filled, the one in view
 * has the halo and aria-current="location". With JavaScript off it is a plain
 * list of links.
 *   - vertical: sticky in a gutter from lg up
 *   - strip: a horizontal, scrollable row of links under the page title
 */

export interface RouteStripSection {
  id: string
  label: string
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(-1)

  React.useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    // A section is "in view" once its heading crosses the upper third of the
    // viewport; the last one that has crossed is the current section.
    const update = () => {
      const line = window.innerHeight * 0.33
      let current = -1
      elements.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) current = i
      })
      // At the very bottom, the last section is current even if short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = elements.length - 1
      }
      setActive(current)
    }

    const observer = new IntersectionObserver(update, {
      rootMargin: "0px 0px -66% 0px",
      threshold: [0, 1],
    })
    elements.forEach((el) => observer.observe(el))
    window.addEventListener("scroll", update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", update)
    }
  }, [ids])

  return active
}

function RouteStrip({
  sections,
  variant = "vertical",
  className,
  "aria-label": ariaLabel = "On this page",
}: {
  sections: RouteStripSection[]
  variant?: "vertical" | "strip"
  className?: string
  "aria-label"?: string
}) {
  const ids = React.useMemo(() => sections.map((s) => s.id), [sections])
  const active = useActiveSection(ids)

  if (variant === "strip") {
    return (
      <nav
        aria-label={ariaLabel}
        data-slot="route-strip"
        className={cn("-mx-4 overflow-x-auto px-4", className)}
      >
        <ol className="flex w-max gap-2 pb-1">
          {sections.map((section, i) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={i === active ? "location" : undefined}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border-strong px-3.5 type-ui text-text hover:bg-surface-strong aria-[current=location]:border-text"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full border-2 border-(--line)",
                    i <= active && "bg-(--line)"
                  )}
                />
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    )
  }

  return (
    <nav aria-label={ariaLabel} data-slot="route-strip" className={className}>
      <RouteList orientation="vertical" className="[--route-gap:--spacing(5)]">
        {sections.map((section, i) => (
          <RouteStop
            key={section.id}
            state={i < active ? "passed" : i === active ? "here" : "upcoming"}
          >
            <a
              href={`#${section.id}`}
              aria-current={i === active ? "location" : undefined}
              className={cn(
                "type-sign underline-offset-4 hover:underline",
                i === active ? "text-text" : "text-muted"
              )}
            >
              {section.label}
            </a>
          </RouteStop>
        ))}
      </RouteList>
    </nav>
  )
}

export { RouteStrip }
