<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jaringan — rules for working in this repo

`ppitsz/` is the PPIT Shenzhen monorepo. `packages/ui` (`@ppitsz/ui`) is the Jaringan design system; `apps/docs` documents every foundation and component: before building UI, read the page for what you are building under `apps/docs/app/(docs)/` (`foundations/`, `components/`, `network/`).

**Stack:** Bun workspaces + Turborepo, Next.js 16 (App Router, RSC), Tailwind CSS v4, shadcn/ui on Base UI, Phosphor icons.

## Language

- Everything is English, in American spelling and a casual "you": routes, copy, emails, titles, errors, comments and docs (ADR 0007). No i18n layer, no `locale` props on components.
- Indonesian only for proper names (PPIT Shenzhen, division names, GumamChan), the insider words **Panitia**, **Danus**, **Oprec** and **Kasir** (no gloss), and the organization's own prose on the main site, whose blocks each carry an author-chosen `lang`. Mark Indonesian passages `lang="id"`.
- Identifiers use the screen's word (`checkIn`, `announcement`; `panitia`, `kasir` as they are). The glossary names the term.
- Dates via `lib/format.ts`: "Sat, Nov 14", "19:00 Shenzhen time (18:00 WIB)". 24-hour times.

## Styling

- Use only the semantic color tokens: `bg-bg`, `bg-surface`, `text-text`, `text-muted`, `bg-accent`, `text-accent-text`, `border-border-strong`, … Never ramps (`bg-merah-600`), never Tailwind's palette (it is removed), never hex.
- Set text with exactly one `type-*` class (`type-ui`, `type-body`, `type-heading-lg`, …). No `text-sm`, `font-medium`, `tracking-*`, `leading-*` — those defaults are removed or banned.
- No `dark:` classes: dark mode, nested `data-theme` previews and `tone-ink` work by re-assigning tokens.
- Division line colors appear only on `line-badge`, `route` and `station` (set with `data-line`), never on text, backgrounds or buttons.
- One `variant="primary"` button per screen. `Button` defaults to `secondary` on purpose.
- Capsules (`rounded-full`) for anything pressable; one soft radius (`rounded-xl`) for panels and photos; `rounded-lg` for text fields and menu items; `rounded-md` for badges.
- Flat: shadows only on dialogs, popovers and toasts. No gradients, blur, glow, pulse, bounce or hover scaling.
- Responsive blocks use container queries (`@container`, `@xl:`), not viewport breakpoints, so they work in any column.

## Components

- Add shadcn components from `apps/docs`: `bunx shadcn@latest add <name>`. They land in `packages/ui/src/components`.
- Every added component gets the restyle pass in `packages/ui/README.md` (mapping table). Also change `import { cn } from "cn"` to `import { cn } from "@ppitsz/ui/lib/utils"`.
- Files without `"use client"` must import icons from `@phosphor-icons/react/ssr` and must not call Base UI hooks such as `useRender`.
- Org data (divisions, campuses, oprec stages, status labels) lives in `packages/ui/src/lib/network.ts`; date, time and number formatting in `lib/format.ts`. Don't hard-code them elsewhere.
- Tailwind only sees class names written out in full. Never build them from template strings (`` `type-${x}` ``).

## Before finishing

```bash
bun run guardrails   # must print nothing
bun run typecheck
bun run lint
bun run build
```

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
