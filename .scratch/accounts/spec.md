# PPITSZ Account: one account, one sign-in, and the admin portal

Status: resolved (built 2026-10-30)

Today Shop and Forms each have their own sign-in pages and their own session cookies (`shop_staff`, `shop_account`, `forms_staff`), even though they already share one set of Firebase Auth accounts (ADR 0006). Roles can only be granted by a developer running `apps/shop/scripts/staff.ts` or `apps/forms/scripts/admins.ts` with the production variables. This feature adds a new app, **PPITSZ Account**, where everyone signs in once, and where Portal admins manage who has which role.

Decided with the user on 2026-10-30 (grilling session). See ADR 0008 and `GLOSSARY.md` (Accounts). Everything below ships at once.

## Decisions so far

- **A new app, `apps/account`**, at `https://account.ppitshenzhen.org` (dev on `:3003`), called **PPITSZ Account**. It is on `ppitsz-next` and uses Jaringan.
- **One PPITSZ account for everyone**: buyers, responders who choose to sign in, and staff. Sign-in, sign-up, forgot password and reset password exist only in the account app. Shop and Forms redirect there and come back.
- **One sign-in covers every app**: one session cookie on `.ppitshenzhen.org` replaces `shop_staff`, `shop_account` and `forms_staff`. Signing out anywhere signs out everywhere.
- **Email and password stay the way in**, checked through our server, so it works in China without a VPN. Google sign-in comes later as an extra button only (accounts.google.com needs a VPN).
- **Roles stay per app** (ADR 0004 still holds): `shopStaff`, `formsStaff`, and a new `portalStaff`. An account with no role is an ordinary account: it can buy and fill in forms. Nothing is stored for that.
- **The profile is shared**: `accounts/{uid}`, replacing the shop's `buyers/{uid}`.
- **Forms keep working without an account.** Signing in only prefills and links.
- **Previews:** signed-in pages work in production and on localhost only. A Vercel preview (`*.vercel.app`) can't share the cookie.
- **Later, in this app:** email broadcasting, oprec applications (through Forms), admin status, Google sign-in, and a Member status if a feature needs one.

## Sessions

- **Cookie:** `ppitsz_session`, a Firebase session cookie, 14 days, `httpOnly`, `sameSite: "lax"`, `secure` in production. Its `domain` comes from `SESSION_COOKIE_DOMAIN` (`.ppitshenzhen.org` in production). Locally it is unset, so the cookie is host-only on `localhost`, and cookies ignore ports, so `:3001`, `:3002` and `:3003` share it.
- **Shared code:** a new workspace package, `packages/accounts` (`@ppitsz/accounts`), holds the cookie name and options, session verification, the Identity Toolkit password check, the profile store and the role lookups (`shopStaff`, `formsStaff`, `portalStaff`, panitia by `teamUids`). The three apps use it instead of their own copies in `lib/server/auth.ts`, `staff.ts` and `buyers.ts`.
- **Every request still looks up roles** in Firestore (ADR 0004). The cookie only proves who someone is.
- **Redirects:** Shop and Forms send signed-out people to `${ACCOUNT_URL}/sign-in?next=<url>`. The account app only follows a `next` on one of our own origins (`SHOP_URL`, `FORMS_URL`, itself). Anything else goes to its home. This prevents an open redirect.
- **Sign-out:** each app's own sign-out action clears the shared cookie (`endSession()`, on the same domain), so signing out anywhere signs out everywhere. No cross-app post is needed.
- **Local development:** every app connects to the real `ppitsz-next` with the same `.env.local` credentials; there is no emulator (decided with the user, 2026-10-30). Only `test:emulator` uses a throwaway one, because the tests wipe the database.
- **Cutover:** the old cookies are no longer read, so everyone signs in once more. Passwords don't change.
- **Revoking:** a password reset revokes the account's refresh tokens, so every session ends on every device, as today.

## Account app

### Sign-in and sign-up

- **`/sign-in`**: email and password. The errors are the shop's today ("Wrong email or password.", too many attempts, disabled account). Then it returns to `next`.
- **`/sign-up`**: name, email and a password of at least 8 characters. Nothing else is asked. If the email already has an account, the form says so and links to sign in. The email isn't verified, because delivery to Chinese mailboxes is unreliable.
- **`/forgot-password`** and **`/reset-password`**: the reset email goes through Resend (ADR 0005), as Forms sends it today. The link opens our own `/reset-password`, never Firebase's page. The code comes from `generatePasswordResetLink`, so Firebase's email template isn't used and needs no setting. Old reset links to the shop's `/reset-password?oobCode=` and Forms' `/staff/reset-password?code=` are passed on.
- The shop's `/sign-in`, `/sign-up`, `/forgot-password` and `/reset-password`, Shop's `/danus/sign-in`, and Forms' `/staff/sign-in`, `/staff/forgot-password` and `/staff/reset-password` become redirects to the account app, keeping `next`.

### Home (`/`)

- Signed out, it shows the sign-in.
- **Your profile:** name, WeChat ID, phone (both optional), email (read-only), change password, sign out.
- **Your apps:** links to Shop and Forms for everyone.
- **Staff launcher**, shown only for what you can open:
  - **Danus dashboard** (`SHOP_URL/danus`), with your role (Admin or Booth staff), if you're in `shopStaff`;
  - **Forms staff** (`FORMS_URL/staff`), if you're a form admin or on the panitia of a form that isn't ended;
  - **Accounts**, if you're a Portal admin.
- **Latest role changes**: the last 10, for Portal admins only.

### Accounts (Portal admins only)

- **`/accounts`**: every account that has at least one role (shop role, form admin, Portal admin, or panitia of a form that isn't ended), with each one side by side. A search box finds any account by exact email, buyers included, so you can give it a role.
- **`/accounts/new`**: add a person by email and name. If the email has no account, one is made with a generated 12-character password without look-alikes, shown once with a "Copy" button for WeChat. An existing account keeps its password.
- **`/accounts/[uid]`**: one person.
  - **Shop role:** none, Booth staff or Admin.
  - **Form admin:** on or off.
  - **Portal admin:** on or off. You can't turn off your own, and the last Portal admin can't be turned off.
  - **Panitia:** read-only, the forms they're on, with links to each form in Forms.
  - **Reset password:** generates a new password, shown once, and signs them out everywhere. The confirmation is built into the page (the viewer has no `confirm()`).
  - **History:** their role changes, newest first.
- **No deleting accounts.** Offboarding means removing every role.
- **Change log:** `roleChanges/{id}` with `{ at, by: { uid, email, name }, target: { uid, email }, kind: "role" | "passwordReset", app?: "shop" | "forms" | "portal", from?: string | null, to?: string | null }`. A password reset is logged without the password. The scripts log too, with `by` as `script`.
- **First Portal admin:** `bun scripts/admins.ts add <email> "<name>"` in `apps/account`, with the same `add | remove | list` shape as the Forms script.
- The shop's `scripts/staff.ts` and Forms' `scripts/admins.ts` keep working for the emulator and seeding, and they write `roleChanges` too.

## Profile

- **`accounts/{uid}`**: `{ name, email, wechatId?, phone?, createdAt, updatedAt }`. Server-only, like every collection (the rules deny all).
- **Migration:** `apps/account/scripts/migrate-profiles.ts` copies every `buyers/{uid}` to `accounts/{uid}` once, and can safely run again (it never overwrites a newer `updatedAt`). After cutover nothing reads `buyers`.
- A staff account signing in for the first time without a profile gets one from its Auth display name, as `ensureBuyerProfile` does today.

## Shop

- **Buyer pages** use the shared session. Checkout still requires sign-in and still returns to the cart.
- **Checkout** starts from `accounts/{uid}`. If WeChat ID is missing it is asked there (and phone for Delivery, as now), and whatever is submitted is saved back to the profile. The order still keeps its copy of the buyer.
- **`/account`** redirects to **`/orders`**, the account's order list (Active and Done), which now ends with a link to the PPITSZ account (details and password) and Sign out. The header's name button leads there too.
- **Danus pages** (`/danus/*`, print, export, proofs, queue) check `shopStaff` against the shared session. A buyer without a role who opens `/danus` sees "You don't have access to the Danus dashboard", with a link to the account app.
- **The Glossary's "kept apart from their staff sign-in" no longer holds:** a Danus member who buys is signed in as themselves.
- **The kasir:** signing out on a booth device signs that person out of every app. The booth sign-in is a personal account, as today.

## Forms

- **Staff pages** (`/staff/*`, print, export, files) check `formsStaff` and panitia against the shared session.
- **Panitia invites** for a new account link to the account app's `/reset-password` to set a password.
- **Responders:** no account needed. Response links and the 6-digit codes are unchanged.
- **Signed in:** on a form that collects name and email, the name, email and WeChat ID start filled in from the profile, and the response stores `accountUid`. **An anonymous form never reads the session or stores `accountUid`.**
- "One response per email" still checks the email typed, not the account.

## Docs

- ADR 0008, "One PPITSZ account and a shared sign-in". ADR 0004 gets a note: roles still live per app, sessions no longer do.
- `GLOSSARY.md`: a new **Accounts** section (PPITSZ Account, Account, Portal admin, Role change). The shop's Account entry, Form admin and Responder change.
- `README.md`: the account app in the table and in `bun run dev` (account on `:3003`).
- `apps/account/README.md`: what it does, its env variables, how to grant the first Portal admin.

## Env

| Variable | Where | Value in production |
|---|---|---|
| `ROOT_DOMAIN` | all three, optional | Unset: on Vercel the apps are `<app>.ppitshenzhen.org` (ADR 0010, which replaced `SESSION_COOKIE_DOMAIN`, `ACCOUNT_URL`, `SHOP_URL` and `FORMS_URL`) |
| `FIREBASE_*`, `RESEND_API_KEY`, `MAIL_FROM_DEFAULT` | account | as in Forms |

## Out of scope

Google sign-in, a Member status, email broadcasting, oprec applications, admin status, changing your email, deleting accounts, letting Danus admins grant roles without being Portal admins, and signed-in previews.

## Before going live

- [ ] Vercel project for `apps/account` at `account.ppitshenzhen.org`, with the variables above.
- [ ] Run `migrate-profiles.ts` against production just before deploying all three apps together.
- [ ] First Portal admin with `bun scripts/admins.ts add` in `apps/account`, with the production variables set.
- [ ] Sign in on the account app, open the Danus dashboard and Forms staff without signing in again, sign out once and check all three are signed out.
