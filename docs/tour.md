# A tour of the code

This page explains how the apps are put together, so you can find your way around and change things with confidence. Read [CONTRIBUTING.md](../CONTRIBUTING.md) first to get the apps running.

You don't need to read every file. Every app follows the same few patterns, so once you understand one flow, you understand most of the codebase.

## The big picture

```
                 ┌───────────── packages/ (shared code) ─────────────┐
                 │  ui        the design system (Jaringan)           │
                 │  accounts  sign-in, sessions, profiles, roles     │
                 └───────────────────────────────────────────────────┘
                        ▲            ▲            ▲            ▲
   apps/ (websites)     │            │            │            │
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ docs :3000 │ │ shop :3001 │ │ forms :3002│ │account:3003│
   │ the design │ │ sales,     │ │ forms,     │ │ sign-in,   │
   │ system's   │ │ orders,    │ │ tickets,   │ │ profiles,  │
   │ own site   │ │ booth      │ │ check-in   │ │ roles      │
   └────────────┘ └────────────┘ └────────────┘ └────────────┘
                        │            │            │
                        ▼            ▼            ▼
              Firebase project "ppitsz" (Firestore, Storage, Auth)
              shared with the old ppitshenzhen.org website
```

- **apps/** are the websites. Each one is a separate Next.js app with its own port and its own README.
- **packages/** is code the apps share. `@ppitsz/ui` has the buttons, colors and page blocks. `@ppitsz/accounts` has everything about who is signed in.
- **Firebase** stores the data. Only our server talks to it, never the browser. Many of our users are in mainland China, where Google is blocked, so the browser only ever talks to our own domain.
- **One account, one sign-in.** Everyone signs in on the account app. The session cookie works across every app, so signing in once on :3003 signs you in on :3001 and :3002 too.

## The four layers

The shop and Forms are built in the same four layers. Once you know them, you know where any piece of code lives and where new code should go.

```
  app/ and components/         What the user sees: pages, forms, buttons
           │  calls
           ▼
  lib/actions/                 Server actions: check who's asking, read the form,
           │  calls            call the store, turn errors into a message
           ▼
  lib/store/                   Firestore and Storage: read, run a transaction, write
           │  calls
           ▼
  lib/domain/                  The rules, in plain TypeScript: no database,
                               no React, no network. Unit-tested.
```

| Layer | Folder | Its job | Can import |
|---|---|---|---|
| UI | `app/`, `components/` | Show data, collect input, call actions | actions, domain (to decide which buttons to show), `@ppitsz/ui` |
| Actions | `lib/actions/` | The entry point from a form. Check the session, parse `FormData`, call the store, return an `ActionState` | store, domain, server |
| Store | `lib/store/` | Talk to Firestore. Every change to stock or status runs in a transaction | domain |
| Domain | `lib/domain/` | Decide what's allowed and compute the result | only other domain files |

`lib/server/` holds code that runs on the server for each request (who's signed in, alerts), and `lib/client/` holds code that runs only in the browser (the cart in `localStorage`, polling).

**The most important rule:** business rules go in `lib/domain/`. If you catch yourself writing "only admins can..." or "an order can't be... once it's..." in a page, an action or the store, move it into the domain. That keeps the rules in one place, testable without a database.

PPITSZ Account is smaller: it has `lib/actions/` and `lib/server/`, and its real logic lives in `packages/accounts`.

## Following one click from start to finish

Here's what happens when a shop admin rejects a payment proof. Open each file as you read.

**1. The button.** [`components/staff/order-actions.tsx`](../apps/shop/components/staff/order-actions.tsx) renders a `ReasonDialog` with `action={rejectAction.bind(null, orderId)}`. The dialog is a form: when the admin types a reason and confirms, React calls the server action with the form's data. There's no `fetch` or API route to write. Next.js handles the request.

**2. The action.** `rejectAction` in [`lib/actions/staff.ts`](../apps/shop/lib/actions/staff.ts):

```ts
export async function rejectAction(orderId: string, _prev: ActionState, formData: FormData) {
  const staff = await requireStaff()            // signed in, with a shop role? else redirect
  let order: Order
  try {
    order = await rejectPayment(orderId, staff, String(formData.get("reason") ?? ""))
  } catch (error) {
    return failure(error, REASON_FIELD)         // a known error becomes a sentence for the user
  }
  revalidatePath("/staff", "layout")            // pages show fresh data
  return { done: Date.now(), buyerMessage: ... }
}
```

Every action calls `requireStaff()` (or `requireBuyer()`) itself. A check in the layout alone wouldn't protect anything, because anyone can call a server action directly.

**3. The store.** `rejectPayment` in [`lib/store/index.ts`](../apps/shop/lib/store/index.ts) loads the order and campaign, then calls `runCommand`, which:

- opens a Firestore **transaction**, so two staff phones can't both change the same order at once,
- reads the order,
- asks the domain, `applyCommand(order, command, actor, now)`, what the order looks like after this command,
- writes the result back.

**4. The domain.** `applyCommand` in [`lib/domain/lifecycle.ts`](../apps/shop/lib/domain/lifecycle.ts) decides everything: is this order awaiting verification? May this role reject it? Is there a reason? If not, it throws a `ShopError` with a code like `REASON_REQUIRED`. If so, it returns the new order with status `pending_payment`, the rejection on record and a fresh deadline.

**5. Back up.** A `ShopError` travels back to the action, where `failure()` looks up its sentence in [`lib/domain/errors.ts`](../apps/shop/lib/domain/errors.ts) ("Write the reason. The buyer will read it.") and shows it under the form field. Any other error is a bug: the user sees a generic message, and the error is posted to the team's group chat ([`lib/server/alerts.ts`](../apps/shop/lib/server/alerts.ts)).

The same page uses `can(order, "reject", staff)` from the lifecycle to decide whether to show the Reject button at all. Because the button and the server ask the same function, the UI never offers something the server would refuse.

Almost every staff action in the shop follows this exact path. Forms works the same way, with its own `lib/domain/`, `lib/store/` and `lib/actions/`.

## Example: how a feature was added

The custom names for merch (commits `cd5a4a2`, `ecbda55` and `2dd24d6`) show which files a typical feature touches. Run `git show --stat cd5a4a2` to see the list. In layer order:

1. **Types** ([`lib/domain/types.ts`](../apps/shop/lib/domain/types.ts)): `allowNickname` on a product, `nicknames` on cart lines and order items.
2. **Rules** ([`lib/domain/order.ts`](../apps/shop/lib/domain/order.ts), [`cart.ts`](../apps/shop/lib/domain/cart.ts), [`errors.ts`](../apps/shop/lib/domain/errors.ts)): an online order must carry one name per unit, or it fails with `NICKNAME_REQUIRED`. Plus tests in `cart.test.ts` and `domain.test.ts`.
3. **Storage** ([`lib/store/convert.ts`](../apps/shop/lib/store/convert.ts)): read and write the new field to Firestore.
4. **Actions** ([`lib/actions/admin.ts`](../apps/shop/lib/actions/admin.ts)): the product form saves the new checkbox.
5. **UI**: the checkbox in `product-form.tsx`, name fields in `checkout-form.tsx`, and the names on the order card, the pickup list and the scanner.

Start at the domain and work outward. That way the rules and tests exist before any screen depends on them.

## Where does my code go?

| You want to... | Put it in |
|---|---|
| Add a page | `app/<route>/page.tsx`. Folders in `(parentheses)` group routes without changing the URL. `[slug]` is a URL parameter. |
| Add a component used by one app | `apps/<app>/components/` |
| Add a component used by several apps | `packages/ui/src/components/` (see [packages/ui/README.md](../packages/ui/README.md)) |
| Add or change a business rule | `apps/<app>/lib/domain/`, with a test next to it |
| Read or write Firestore | `apps/<app>/lib/store/` |
| Handle a form submit or button press | a server action in `apps/<app>/lib/actions/` |
| Show an error message the user caused | a new code in `lib/domain/errors.ts`, thrown as a `ShopError` |
| Format a date, time or price | `@ppitsz/ui/lib/format` (never write your own) |
| Use division, campus or status names | `@ppitsz/ui/lib/network` |
| Check who's signed in | `lib/server/auth.ts` (`requireStaff`, `requireBuyer`, `getSession`) |

## Concepts you'll meet

You don't need to master these before starting. Look them up when you hit them.

**Server and client components.** Next.js renders components on the server by default: they can read the database directly and send only HTML to the browser. A file that starts with `"use client"` runs in the browser too, and is the only kind that can use `useState`, `onClick` and other interactivity. Rule of thumb: pages are server components, and small interactive pieces (a form, a scanner, a dialog) are client components.

**Server actions.** Functions in a file marked `"use server"`. The UI passes one to a `<form action={...}>` or calls it, and Next.js turns that into a request to the server. They live in `lib/actions/`. Client components use `useActionState` to show the result (`ActionState`: an error, field errors, or done).

**Firestore transactions.** `db().runTransaction(async (tx) => ...)` reads and writes several documents as one step. If someone else changes the same documents in the middle, Firestore retries the whole function. This is how two buyers racing for the last T-shirt can't both get it.

**The Admin SDK.** `firebase-admin` lets our server read and write anything, ignoring the security rules. That's why the rules in [`firebase/firestore.rules`](../firebase/firestore.rules) can deny the browser almost everything (ADR 0016): the browser never needs direct access.

**Design tokens.** Instead of colors like `bg-red-600`, you write what the color means: `bg-accent`, `text-muted`, `bg-surface`. The design system decides the actual color, and swaps it for dark mode. Text size works the same way: one `type-*` class per element. The docs site (`bun run dev`, then http://localhost:3000) shows every token and component.

**Bun.** A faster replacement for Node and npm. `bun install` instead of `npm install`, `bun run dev` instead of `npm run dev`, `bun test` for tests. Scripts in `scripts/` and `apps/*/scripts/` are TypeScript files run with `bun <file>`.

**Turborepo.** Runs a command (`dev`, `build`, `lint`) in every app and package at once, in the right order, and skips work that hasn't changed. You'll only see it as the `turbo` in the root `package.json`.

## The docs that already exist

The repo has a lot of written knowledge. Here's what each kind is for:

| Doc | Read it when |
|---|---|
| `apps/<app>/README.md` | You're working on that app. It lists every page, every `lib/` file and how the features behave. |
| [GLOSSARY.md](../GLOSSARY.md) | You're unsure what a word means, or what to call something in copy or code. Each term lists the words to avoid. |
| [docs/adr/](adr/) | You wonder "why is it built this way?" Each ADR (architecture decision record) is one decision, with the problem, the choice and the trade-offs. |
| The docs site, `apps/docs` | You're building UI. Each page shows a component and its rules. |
| `.scratch/<feature>/spec.md` | You want the full plan behind a big feature (accounts, delivery, Forms...). |
| `AGENTS.md`, `CLAUDE.md`, `docs/agents/` | Instructions for AI coding assistants. Humans can read `AGENTS.md` as a compact list of the house rules; [CONTRIBUTING.md](../CONTRIBUTING.md) explains them. |

Code comments explain the "why" too: most `lib/` files start with a block comment saying what the file is responsible for. Read the top of a file before reading its functions.
