# @ppitsz/ui — Jaringan

The PPIT Shenzhen design system, documented in `apps/docs` with one page per foundation and component.

## What's inside

| Import | Contents |
|---|---|
| `@ppitsz/ui/globals.css` | Tailwind v4 theme: color ramps and semantic tokens, light/dark/tone-ink scopes, the type scale and `type-*` utilities, network utilities (`route`, `station*`, `line-badge`, `exit-badge`, `station-code`, `line-stripe`, `stripe-train`, `ticket-notch-*`, `route-draw`), motion |
| `@ppitsz/ui/components/<name>` | shadcn/ui components on Base UI, restyled: `button`, `field`, `input`, `textarea`, `checkbox`, `radio-group`, `native-select`, `badge`, `status-badge`, `toggle` (with `FilterChip`), `card`, `alert` (the notice), `dialog`, `alert-dialog`, `popover`, `dropdown-menu`, `navigation-menu`, `avatar`, `sonner` (with `notify`), `accordion`, `skeleton`, `spinner`, `empty`, `separator`, `label`, plus `link` and `container` |
| `@ppitsz/ui/components/network/<name>` | `route` (Route, Station, Interchange, RouteList, RouteStop), `line-badge`, `station-label`, `route-tracker`, `strip-map`, `route-strip`, `sign` (SignBoard, Sign, SignPictogram, ExitBadge), `station-code`, `station-nameplate`, `network-map`, `campus-line` |
| `@ppitsz/ui/components/og/<name>` | `station-sign` (OgStationSign): the share image, for next/og |
| `@ppitsz/ui/components/blocks/<name>` | `departure-board`, `timetable`, `ticket`, `gate`, `service-notice`, `profile-menu`, `member-card`, `article-card`, `site-header`, `site-footer`, `theme-control`, `wechat-dialog`, `brand` (PpiMark, SkipLink, LanguageSwitcher) |
| `@ppitsz/ui/lib/<name>` | `utils` (`cn`), `network` (divisions, campuses, oprec stages, status labels), `format` (dates, times with WIB, numbers, bylines), `nav` (`NavLink`, `TransferLink`), `raw-colors` (the palette as hex, for emails and share images only), `shrink-image` (browser-side image shrinking before upload) |
| `@ppitsz/ui/hooks/<name>` | `use-navigation-pending` (the header's loading train) |

Blocks take images through a `media` slot and links through `linkAs`, so apps pass `next/image` and `next/link` without the package depending on them.

## The restyle pass

shadcn components arrive styled with shadcn's tokens and Tailwind's default type scale. Jaringan removes both (`--color-*`, `--text-*`, `--animate-*` are reset in the theme), so unconverted classes silently render nothing. After every `shadcn add`, convert the file:

| shadcn | Jaringan |
|---|---|
| `import { cn } from "cn"` | `import { cn } from "@ppitsz/ui/lib/utils"` |
| `bg-background` / `text-foreground` | `bg-bg` / `text-text` |
| `bg-primary text-primary-foreground hover:bg-primary/80` | `bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active` |
| `bg-muted`, `bg-secondary`, `hover:bg-muted` (fills) | `bg-surface`, `hover:bg-surface-strong` |
| `text-muted-foreground` | `text-muted` |
| `bg-popover`, `bg-card` | `bg-surface-raised` + `border border-border shadow-lg` (floating) / `bg-surface` (panel) |
| `border-input` | `border-border-strong` |
| `destructive`, `text-destructive`, `bg-destructive/10` | `danger`, `text-danger-text`, `bg-danger-subtle` |
| `focus-visible:ring-*`, `ring-ring`, `outline-ring/50` | remove — the global `:focus-visible` outline covers focus |
| `text-sm`, `text-xs`, `font-medium`, `tracking-*`, `leading-*` | one `type-*` class: `type-ui` (controls, labels), `type-body` / `type-body-sm`, `type-caption`, `type-kicker` |
| `rounded-lg` on pressables | `rounded-full` (capsule) |
| `rounded-lg` / `rounded-xl` on panels | `rounded-xl` (the one soft radius) |
| `disabled:opacity-50` | `disabled:bg-surface disabled:text-subtle` — no transparency on text |
| `bg-black/10 backdrop-blur-xs` | `bg-backdrop`, no blur |
| `animate-in fade-in-0 zoom-in-95`, `animate-out …` | `data-open:animate-enter` (or `animate-fade` for backdrops); nothing on close |
| any `dark:` class | remove |
| Lucide-style icon from the main entry, in a file without `"use client"` | import from `@phosphor-icons/react/ssr` |
| Base UI `useRender` in a file without `"use client"` | add `"use client"`, or use a plain `as` prop |

Then check behavior against the component's page in `apps/docs`: states, copy, accessibility. `bun run guardrails` catches most leftovers.

## Conventions

- `Button` defaults to `variant="secondary"`; red (`primary`) is always explicit, one per screen.
- Status words come from `STATUSES` in `lib/network.ts` via `<StatusBadge domain value />`.
- Network components draw decoration `aria-hidden` next to a real list; every station has a visible label.
- Blocks respond to their container (`@container` + `@xl:` …), not the viewport.
