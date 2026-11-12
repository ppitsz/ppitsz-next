# PPITSZ Account

The one sign-in for every PPIT Shenzhen app, later at `https://account.ppitshenzhen.org` (ADR 0008). Everyone signs in, signs up and resets their password here: buyers, panitia, Danus staff. One session cookie on `.ppitshenzhen.org` covers the shop and Forms too, and signing out anywhere signs out everywhere.

- **Your account** (`/`): your profile (name, and optionally WeChat ID and phone, shared by every app), links to the apps, a launcher to the staff apps you can open (the Shop dashboard, the Forms dashboard, Accounts), and how you sign in: change or add a password, link or unlink Google.
- **Continue with Google** (`/auth/google`, ADR 0011): signs in to the account Google is linked to, links Google to the account with the same email, or makes a new account. Needs a VPN in mainland China; email and password don't.
- **Accounts** (`/accounts`, Portal admins only): everyone with a role, side by side; find any account by email; add a person (a new account gets a password shown once, to send on WeChat); give or take away the shop role, Form admin and Portal admin; reset a password (signs them out everywhere). Panitia are shown, but are added on each form in Forms. Accounts are never deleted: removing every role is how someone leaves.
- **The change log** (`roleChanges`): every role change and password reset, by whom and when, on each person's page and the latest on the home page. Never the password.

A Portal admin can't remove their own Portal admin role, and the last Portal admin can't be removed.

| Path | What |
|---|---|
| `../../packages/accounts` | `@ppitsz/accounts`, shared by every app: Firebase, the session (`session.ts`), the profile (`profile.ts`), roles and the change log (`roles.ts`), passwords, Google sign-in (`google.ts`, `google-sign-in.ts`) |
| `lib/actions/` | `account.ts` (sign in, up and out, reset, profile, add a password, unlink Google) · `admin.ts` (Accounts) |
| `lib/server/` | `auth.ts` (requireSession, requirePortalAdmin), `google.ts` (the Google routes' cookie and callback URL), rate limits |
| `app/` | `/` · `/sign-in` · `/sign-up` · `/forgot-password` · `/reset-password` · `/auth/google` and its `/callback` · `/accounts` · `/accounts/new` · `/accounts/[uid]` |

## Local development

Development connects to the **real Firebase project**, `ppitsz-next`, like production: there is no emulator. Everything you do locally (orders, accounts, role changes, password resets) happens to real data. Copy the `FIREBASE_*` variables into `.env.local` (the same five in the shop, Forms and PPITSZ Account).

`bun run dev` from the repo root runs every app; this one is on http://localhost:3003. Development sends no reset email: the page links to the reset itself.

On localhost, cookies ignore ports, so signing in on :3003 signs you in on :3001 and :3002 too. A Vercel preview (`*.vercel.app`) can't share the cookie: test signed-in flows locally.

## Production

Environment (see `.env.example`): the `FIREBASE_*` variables of `ppitsz-next`, and `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (below). No URLs: on Vercel every app is `<app>.ppitshenzhen.org`, from the list in `packages/accounts/src/urls.ts` (ADR 0010). `ROOT_DOMAIN` moves all of them to another root, for a preview.

Until Forms is marked `live` in that list, the home page leaves out the Forms cards, so production has no dead links.

Firebase sends the reset email (from `noreply@<project>.firebaseapp.com`, worded by its template). Its link opens Firebase's own page on `ppitsz-next.firebaseapp.com`, which needs a VPN in mainland China: Firebase no longer lets this project change the template's action URL (ADR 0011). `/reset-password` still takes its `oobCode`, should that ever change.

**Continue with Google** needs a Web OAuth client in the `ppitsz-next` Google Cloud project (console.cloud.google.com › Google Auth Platform):

1. **Branding**: app name "PPITSZ Account", a support email, `ppitshenzhen.org` as an authorized domain.
2. **Audience**: External, then **Publish app**. While it is "Testing", only the listed test users can sign in. The scopes (`openid email profile`) need no review.
3. **Clients › Create client › Web application**, with the authorized redirect URIs `https://account.ppitshenzhen.org/auth/google/callback` and `http://localhost:3003/auth/google/callback`.
4. Put its client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, on Vercel and in `.env.local`. Without them the button is hidden.

Once, at cutover:

```bash
bun scripts/migrate-profiles.ts                 # copies the shop's buyers/{uid} to accounts/{uid}; safe to run again
bun scripts/admins.ts add <email> "<name>"      # the first Portal admin; then add others in Accounts
```

Every existing session ends at cutover (the old `shop_staff`, `shop_account` and `forms_staff` cookies aren't read anymore), so everyone signs in once more. Passwords don't change.
