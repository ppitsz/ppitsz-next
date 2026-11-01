import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"

/*
 * The PPI Tiongkok Cabang Shenzhen mark: red on light, white on dark and
 * tone-ink. Never on photos, never recolored. Both files are rendered and
 * the theme tokens show the right one, so it follows tone-ink scopes too.
 * (Raster for now; an SVG trace is a follow-up.)
 */
function PpiMark({
  redSrc = "/brand/ppi-mark-red.webp",
  whiteSrc = "/brand/ppi-mark-white.webp",
  alt = "PPI Tiongkok Cabang Shenzhen",
  className,
}: {
  redSrc?: string
  whiteSrc?: string
  alt?: string
  /** Size it by height, e.g. "h-10". */
  className?: string
}) {
  return (
    <>
      <img src={redSrc} alt={alt} className={cn("mark-red w-auto", className)} />
      <img src={whiteSrc} alt={alt} className={cn("mark-white w-auto", className)} />
    </>
  )
}

/** The first focusable element on every page. */
function SkipLink({
  href = "#content",
  children = "Skip to content",
}: {
  href?: string
  children?: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="sr-only rounded-full bg-bg px-5 py-3 type-ui text-text focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:border-2 focus:border-text"
    >
      {children}
    </a>
  )
}

export interface LanguageOption {
  /** "id", "en", "zh" */
  code: string
  /** Visible short label: "ID", "EN", "中文" */
  short: string
  /** Full language name, in that language: "Bahasa Indonesia", "English", "中文" */
  name: string
  /** BCP 47 tag for lang/hrefLang: "id", "en", "zh-Hans" */
  lang: string
  href: string
}

/** "ID · EN · 中文". Each link carries lang, hrefLang and the full name. */
function LanguageSwitcher({
  options,
  current,
  linkAs,
  className,
  "aria-label": ariaLabel = "Language",
}: {
  options: LanguageOption[]
  current: string
  linkAs?: React.ElementType
  className?: string
  "aria-label"?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"
  return (
    <ul aria-label={ariaLabel} className={cn("flex items-center", className)}>
      {options.map((option, i) => (
        <li key={option.code} className="flex items-center">
          {i > 0 && (
            <span aria-hidden className="px-1.5 type-ui text-subtle">
              ·
            </span>
          )}
          <Link
            href={option.href}
            lang={option.lang}
            hrefLang={option.lang}
            aria-label={option.name}
            aria-current={option.code === current ? "page" : undefined}
            className="inline-flex min-h-11 min-w-8 items-center justify-center type-ui text-muted underline-offset-4 hover:underline aria-[current=page]:text-text aria-[current=page]:underline aria-[current=page]:decoration-2"
          >
            {option.short}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export { PpiMark, SkipLink, LanguageSwitcher }
