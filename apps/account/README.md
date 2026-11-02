# PPITSZ Account

The one sign-in for every PPIT Shenzhen app, later at `https://account.ppitshenzhen.org` (ADR 0008). Everyone signs in, signs up and resets their password here: buyers, panitia, Danus staff. One session cookie on `.ppitshenzhen.org` covers the shop and Forms too, and signing out anywhere signs out everywhere.

- **Your account** (`/`): your profile (name, and optionally WeChat ID and phone, shared by every app), links to the apps, and a launcher to the staff apps you can open: the Shop dashboard, the Forms dashboard, Accounts.
- **Accounts** (`/accounts`, Portal admins only): everyone with a role, side by side; find any account by email; add a person (a new account gets a password shown once, to send on WeChat); give or take away the shop role, Form admin and Portal admin; reset a password (signs them out everywhere). Panitia are shown, but are added on each form in Forms. Accounts are never deleted: removing every role is how someone leaves.
- **The change log** (`roleChanges`): every role change and password reset, by whom and when, on each person's page and the latest on the home page. Never the password.

A Portal admin can't remove their own Portal admin role, and the last Portal admin can't be removed.

| Path | What |
|---|---|
| `../../packages/accounts` | `@ppitsz/accounts`, shared by every app: Firebase, the session (`session.ts`), the profile (`profile.ts`), roles and the change log (`roles.ts`), passwords |
| `lib/actions/` | `account.ts` (sign in, up and out, reset, profile) · `admin.ts` (Accounts) |
| `lib/server/` | `auth.ts` (requireSession, requirePortalAdmin), `mail.ts` (the reset email through Resend), rate limits |
| `app/` | `/` · `/sign-in` · `/sign-up` · `/forgot-password` · `/reset-password` · `/accounts` · `/accounts/new` · `/accounts/[uid]` |

## Local development

Development connects to the **real Firebase project**, `ppitsz-next`, like production: there is no emulator. Everything you do locally (orders, accounts, role changes, password resets) happens to real data. Copy the `FIREBASE_*` variables into `.env.local` (the same five in the shop, Forms and PPITSZ Account).

`bun run dev` from the repo root runs every app; this one is on http://localhost:3003. Reset emails land in `.outbox/` without `RESEND_API_KEY`, and the page links to the reset itself.

On localhost, cookies ignore ports, so signing in on :3003 signs you in on :3001 and :3002 too. A Vercel preview (`*.vercel.app`) can't share the cookie: test signed-in flows locally.

## Production

Environment (see `.env.example`): the `FIREBASE_*` variables of `ppitsz-next`, `SESSION_COOKIE_DOMAIN=.ppitshenzhen.org`, `ACCOUNT_URL`, `SHOP_URL`, `FORMS_URL`, `RESEND_API_KEY`, `MAIL_FROM_DEFAULT`. The shop and Forms need `SESSION_COOKIE_DOMAIN` and `ACCOUNT_URL` too.

Without `FORMS_URL`, the home page leaves out the Forms cards, so a deploy without Forms has no dead links.

Without `RESEND_API_KEY`, Firebase sends the reset email itself (from `noreply@<project>.firebaseapp.com`, worded by its template). Its link must open our page, not Google's: in the Firebase console › Authentication › Templates › Password reset, set **Customize action URL** to `<ACCOUNT_URL>/reset-password`. That setting is for the whole project, so local development's resets link there too.

Once, at cutover:

```bash
bun scripts/migrate-profiles.ts                 # copies the shop's buyers/{uid} to accounts/{uid}; safe to run again
bun scripts/admins.ts add <email> "<name>"      # the first Portal admin; then add others in Accounts
```

Every existing session ends at cutover (the old `shop_staff`, `shop_account` and `forms_staff` cookies aren't read anymore), so everyone signs in once more. Passwords don't change.
