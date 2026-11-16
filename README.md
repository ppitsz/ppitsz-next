# ppitsz

The PPIT Shenzhen monorepo. It starts with **Jaringan**, the design system for every PPIT Shenzhen website, and a site that previews it. The organization's website and other sites join later as apps.

| Path | Package | What it is |
|---|---|---|
| `packages/ui` | `@ppitsz/ui` | The design system: tokens, shadcn/ui components restyled to Jaringan, network components and page blocks |
| `apps/docs` | `docs` | The preview site: foundations, components, network graphics and an example home page |
| `apps/shop` | `shop` | Toko PPIT Shenzhen, the sales site: online orders delivered or collected by QR, payment proof, and walk-in sales ([README](apps/shop/README.md)) |
| `apps/forms` | `forms` | PPITSZ Forms: forms, registrations and tickets with check-in ([README](apps/forms/README.md)) |
| `apps/account` | `account` | PPITSZ Account: the one sign-in for every app, profiles, and Accounts for Portal admins (ADR 0008) |
| `packages/typescript-config`, `packages/eslint-config` | | Shared config |
| `scripts/guardrails.ts` | | Design-rule checks |

The design system documents itself: each page in [`apps/docs/app/(docs)/`](apps/docs/app/(docs)/) states the rules for its foundation or component.

## Getting started

Requires [Bun](https://bun.sh) 1.3+ and Node 20.19+ or 22.12+.

```bash
bun install
bun run dev          # docs on http://localhost:3000, shop :3001, forms :3002, account :3003
```

| Command | Does |
|---|---|
| `bun run dev` | Run every app in dev mode (Turborepo) |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript across the workspace |
| `bun run lint` | ESLint across the workspace |
| `bun run guardrails` | Check the design rules; prints nothing when clean |

## Using the design system in an app

```tsx
// next.config.ts
const nextConfig = { transpilePackages: ["@ppitsz/ui"] }

// app/layout.tsx — load Archivo, Atkinson Hyperlegible Next and Noto Sans SC
// with next/font (see apps/docs/app/layout.tsx), then:
import "@ppitsz/ui/globals.css"

// anywhere
import { Button } from "@ppitsz/ui/components/button"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
```

## Adding a shadcn component

```bash
cd apps/docs
bunx shadcn@latest add tooltip   # lands in packages/ui/src/components
```

Then give it the restyle pass described in [`packages/ui/README.md`](packages/ui/README.md) and run `bun run guardrails`.
