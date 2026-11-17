# Contributing

Welcome. This guide gets you from a fresh clone to a merged change, and explains the house rules and why they exist. You need to know some JavaScript and React. Everything else is explained here or in [docs/tour.md](docs/tour.md), which shows how the code fits together.

## 1. Set up (about 15 minutes)

You need:

- [Bun](https://bun.sh) 1.3 or later (`bun --version`)
- Node 20.19+ or 22.12+ (`node --version`)
- Git, and an editor. VS Code with the ESLint, Prettier and Tailwind CSS IntelliSense extensions works well.

```bash
git clone https://github.com/ppitsz/ppitsz-next.git ppitsz
cd ppitsz
bun install
```

### Environment variables

The shop, Forms and PPITSZ Account need Firebase credentials. In each of `apps/shop`, `apps/forms` and `apps/account`, copy `.env.example` to `.env.local`:

```bash
cp apps/shop/.env.example apps/shop/.env.local
cp apps/forms/.env.example apps/forms/.env.local
cp apps/account/.env.example apps/account/.env.local
```

Then ask a maintainer (listed in [.github/CODEOWNERS](.github/CODEOWNERS)) for the five `FIREBASE_*` values. They're the same in all three files. Everything else in `.env.example` is optional for development.

`.env.local` is ignored by Git. Never commit it, and don't paste the private key into a group chat.

The docs site (`apps/docs`) needs no variables, so you can start there while you wait.

> [!WARNING]
> **Development uses the real database.** There is no local copy: your dev server reads and writes the same Firebase project as the live sites, including the old ppitshenzhen.org (ADR 0013). An order you place locally is a real order. A role you change is really changed. Create test data in a **Draft** campaign (its orders are marked Test and can be deleted from Settings), use your own account, and never run a script against other people's accounts to "see what happens".

### Run it

```bash
bun run dev
```

| App | URL |
|---|---|
| Docs (the design system) | http://localhost:3000 |
| Shop | http://localhost:3001 (staff dashboard at `/staff`) |
| Forms | http://localhost:3002 (staff dashboard at `/staff`) |
| PPITSZ Account (sign in here) | http://localhost:3003 |

Sign up for an account on :3003. To use a staff dashboard, ask a Portal admin to give your account a role.

## 2. Find your way around

Read [docs/tour.md](docs/tour.md). It has a map of the repo, the four layers every app is built from, and one click traced through the code from button to database. It takes about 15 minutes and saves hours.

Then read the README of the app you're working on (`apps/<app>/README.md`), which lists every page and every `lib/` file.

## 3. Make a change

1. **Start from an up-to-date `main` and make a branch:**
   ```bash
   git switch main && git pull
   git switch -c fix/scanner-typo
   ```
2. **Make the change.** If it's a business rule, put it in `lib/domain/` and add a test next to it (see [Tests](#tests)).
3. **Run the checks** from the repo root:
   ```bash
   bun run check
   ```
   This runs, in order: `guardrails` (the design rules; prints nothing when clean), `typecheck`, `lint` and `build`. Fix whatever it reports. You can run each one alone too, such as `bun run typecheck`.
4. **Commit** with a message that says what changed for the user, in plain English: "Show custom names at the pickup scanner", not "update scanner.tsx".
5. **Push and open a pull request** against `main`. Say what you changed and how you checked it. Add a screenshot for anything visible. A maintainer reviews every PR before it's merged.

Small PRs get reviewed faster. If you're planning something big, talk to a maintainer first. Big features have a written plan in `.scratch/<feature>/spec.md`.

### Tests

The business rules have unit tests, written with Bun's built-in test runner. They need no database and run in seconds:

```bash
cd apps/shop && bun run test      # or apps/forms, or packages/accounts
```

A test sits next to its file: `lifecycle.ts` and `lifecycle.test.ts`. Copy the style of the tests already there. `lib/domain/fixtures.ts` builds sample orders and campaigns for you.

The Firestore code (`lib/store/`) has integration tests that run against a throwaway Firebase emulator, never the real project. They need Java 21+:

```bash
cd apps/shop && bun run test:emulator
```

## 4. The house rules, and why

These are enforced in review, and partly by `bun run guardrails`. The full list for AI assistants is in [AGENTS.md](AGENTS.md). Here's the reasoning behind them.

### Words

- **Everything is in English**, in American spelling, speaking to the user as "you": code, copy, emails, errors, comments (ADR 0007). Members come from many campuses and not all of them read Indonesian comfortably. Indonesian appears only in proper names (PPIT Shenzhen, GumamChan) and in the organization's own posts on the main site.
- **We speak as one organization.** Copy says "We check your transfer proof", never "Danus checks your proof". Users don't know or care which division does what (ADR 0012).
- **No insider words.** "Organizers", not "panitia". "Recruitment", not "oprec". If you're unsure what to call something, look it up in [GLOSSARY.md](GLOSSARY.md). It lists the word to use and the words to avoid.
- **Dates and times** come from `@ppitsz/ui/lib/format`: "Sat, Nov 14", "19:00 Shenzhen time (18:00 WIB)", 24-hour. Never format them by hand, so every page agrees.

### Look and feel

The design system, Jaringan, is inspired by metro maps: each division is a colored "line", events are "stations". Open the docs site (http://localhost:3000) to see it. The rules keep every app looking like one product:

- **Use color tokens, not colors.** Write `bg-accent`, `text-muted`, `bg-surface`, `border-border-strong`. Never `bg-red-600`, hex codes or `dark:` classes. The tokens change automatically for dark mode, so a raw color would break it. Tailwind's default palette is removed, so `bg-red-600` silently renders nothing.
- **One `type-*` class sets text.** `type-body`, `type-ui`, `type-heading-lg`, and so on. Don't use `text-sm` or `font-bold`: those are removed too.
- **One red (primary) button per screen**, for the main action. `Button` is gray (secondary) by default on purpose.
- **Round shapes have meaning.** Pill-shaped (`rounded-full`) means you can press it. Panels and photos use `rounded-xl`, text fields `rounded-lg`, badges `rounded-md`.
- **Flat.** Shadows only on things that float (dialogs, menus, toasts). No gradients, blur, glow, or bouncing and pulsing animations.
- **Division colors are for the metro-map graphics only** (line badges, routes, stations), never for text or buttons.
- **Write Tailwind classes out in full.** Tailwind finds classes by reading your source code, so `` `type-${size}` `` produces nothing. Use a lookup object with the full class names instead.

`bun run guardrails` catches most slips and prints the file, line and rule. If a line genuinely needs an exception (rare), add a `guardrails-ignore` comment to it and explain why in your PR.

### Components

- **Look for an existing component first**, in `@ppitsz/ui`. The docs site shows them all, each with its rules.
- **Adding a new shadcn component** is done from `apps/docs`: `bunx shadcn@latest add <name>`. It lands in `packages/ui/src/components` and then needs restyling to Jaringan. The table in [packages/ui/README.md](packages/ui/README.md) shows exactly what to change.
- **Divisions, campuses, statuses** live in `packages/ui/src/lib/network.ts`. Import them, don't retype them.
- **Server files import icons from `@phosphor-icons/react/ssr`.** A file without `"use client"` at the top runs on the server, where the normal icon import fails.

### Security

- **Every server action checks who's calling**, with `requireStaff()` or `requireBuyer()` at the top. Don't rely on the page or layout having checked: anyone can call an action directly.
- **The browser never talks to Firebase.** All reads and writes go through our server (it also keeps the site working in China without a VPN). Don't add the Firebase client SDK to a page.
- **Avatars and uploaded images are served from our own routes** (`/avatars/...`, `/media/...`), never directly from Google (ADR 0009).

## 5. Things that trip people up

- **"This is NOT the Next.js you know."** You'll see this at the top of `AGENTS.md`. We use Next.js 16 and React 19, which are newer than most tutorials. When something doesn't work the way a tutorial says, check the docs that ship with the installed version, in `apps/shop/node_modules/next/dist/docs/`.
- **Signed in on one port, signed in on all.** Browsers share cookies across `localhost` ports. Sign out on :3003 to sign out everywhere.
- **The camera scanner needs `localhost` or HTTPS.** On your phone over Wi-Fi (`http://192.168.x.x:3001`), use "Take or choose a photo of the QR code" instead.
- **Emails in development** aren't sent: Forms writes them to `apps/forms/.outbox/` as HTML files you can open in a browser.
- **The app fails at startup** with a Firebase error? Your `.env.local` is missing or incomplete for that app.
- **A Tailwind class does nothing?** It's probably one of the removed defaults (a palette color, `text-sm`) or built from a template string. Run `bun run guardrails`.
- **Typecheck complains about routes or `PageProps`?** `bun run typecheck` regenerates Next's route types first. Run it rather than plain `tsc`.

## 6. Using AI assistants

You're welcome to use Claude, Copilot, ChatGPT or anything else. The files `AGENTS.md`, `CLAUDE.md` and `docs/agents/` give AI tools the house rules automatically. Some tools also re-add a block to `AGENTS.md` when they run: leave it in.

But you're the author of your PR. Read every line before you open it, run `bun run check`, and be ready to explain the change in review. If you don't understand some code an assistant wrote, ask it to explain, or ask a maintainer. That's how you learn the codebase, and it's what makes it maintainable by people.

## 7. Getting help

Ask a maintainer (see [.github/CODEOWNERS](.github/CODEOWNERS)). When you're stuck, say what you tried and paste the exact error. That makes it much quicker to help.
