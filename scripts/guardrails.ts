#!/usr/bin/env bun
/*
 * Jaringan guardrails (the rules on the apps/docs pages), plus checks for shadcn
 * code that skipped the restyle pass. Prints every hit and exits 1, or
 * prints nothing and exits 0.
 *
 *   bun run guardrails
 *
 * Text inside <code>…</code> on one line is ignored, so docs can show the
 * classes they forbid. Add `guardrails-ignore` to a line to skip it.
 */
import { Glob } from "bun"
import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(import.meta.dir, "..")
const SOURCES = [
  "packages/ui/src/**/*.{ts,tsx}",
  "apps/*/app/**/*.{ts,tsx}",
  "apps/*/components/**/*.{ts,tsx}",
  "apps/*/lib/**/*.{ts,tsx}",
]

// A class-like token boundary: start, whitespace, quote, backtick, brace,
// paren or a variant colon before; whitespace, quote, backtick, brace or
// paren after.
const B = String.raw`(?:^|[\s"'\x60{(:])`
const E = String.raw`(?=[\s"'\x60})]|$)`

const RULES: { name: string; re: RegExp; skip?: (file: string) => boolean }[] = [
  {
    name: "ramp color used directly — use a semantic token",
    re: new RegExp(`${B}(bg|text|border|outline|decoration|fill|stroke|divide|ring)-(merah|beton|hijau|amber)-[0-9]{2,3}${E}`),
  },
  {
    name: "line color used as text — line colors are for network graphics only",
    re: new RegExp(`${B}text-line-(bph|danus|depol|humas|it|medkref|pka|sosbud)${E}`),
  },
  {
    name: "banned styling (gradients, blur, ambient animation, hover scaling, justify, tracking, leading)",
    re: new RegExp(
      `${B}(bg-(linear|radial|conic|gradient)[\\w-]*|backdrop-blur[\\w-]*|brightness-[\\w-]+|animate-(pulse|bounce|ping)|hover:scale-[\\w-]+|text-justify|tracking-[\\w-]+|leading-[\\w-]+)${E}`
    ),
  },
  {
    name: "Google Fonts CDN or a retired font",
    re: /fonts\.googleapis\.com|fonts\.gstatic\.com|\bMontserrat\b|\bPoppins\b|\bCinzel\b|\bGeist\b|\bInter\b/,
  },
  {
    name: "shadcn token left over — restyle to Jaringan tokens",
    re: new RegExp(
      `${B}(?:[\\w-]+:)*(bg|text|border|ring|outline|fill|stroke)-(primary|secondary|foreground|background|card|popover|destructive|input|sidebar|muted-foreground|accent-foreground|chart-\\d)(-foreground)?(\\/\\d+)?${E}|${B}(?:[\\w-]+:)*bg-muted(\\/\\d+)?${E}|${B}(?:[\\w-]+:)*ring-ring[\\w/-]*${E}`
    ),
  },
  {
    name: "default type size or weight — use one type-* class",
    re: new RegExp(
      `${B}(?:[\\w-]+:)*(text-(xs|sm|base|lg|xl|[2-9]xl)|font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black))${E}`
    ),
  },
  {
    name: "tw-animate-css class — use animate-enter / animate-fade",
    re: new RegExp(`${B}(?:[\\w-]+:)*(animate-(in|out)|(fade|zoom|slide)-(in|out)(-[\\w-]+)?)${E}`),
  },
  {
    name: "dark: variant — the tokens already handle dark mode",
    re: new RegExp(`${B}dark:[\\w[-]`),
  },
  {
    name: 'bare `cn` import — import { cn } from "@ppitsz/ui/lib/utils"',
    re: /from ["']cn["']/,
    skip: (file) => file.endsWith("packages/ui/src/lib/utils.ts"),
  },
]

const hits: string[] = []

for (const pattern of SOURCES) {
  for (const path of new Glob(pattern).scanSync({ cwd: ROOT, onlyFiles: true })) {
    const file = relative(ROOT, join(ROOT, path)).replaceAll("\\", "/")
    if (file.includes("node_modules") || file.includes("/.next/")) continue
    const lines = readFileSync(join(ROOT, path), "utf8").split(/\r?\n/)
    lines.forEach((raw, i) => {
      if (raw.includes("guardrails-ignore")) return
      const line = raw.replace(/<code>[^<]*<\/code>/g, "")
      for (const rule of RULES) {
        if (rule.skip?.(file)) continue
        const match = line.match(rule.re)
        if (match) {
          hits.push(`${file}:${i + 1}  ${rule.name}\n    ${match[0].trim()}`)
        }
      }
    })
  }
}

if (hits.length > 0) {
  console.log(hits.join("\n"))
  console.log(`\n${hits.length} guardrail violation${hits.length === 1 ? "" : "s"}.`)
  process.exit(1)
}
