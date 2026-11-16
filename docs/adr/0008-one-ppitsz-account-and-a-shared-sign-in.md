# 8. One PPITSZ account and a shared sign-in

Date: 2026-10-30 · Status: accepted, the profile moved to users/{uid} by ADR 0014

## Context

Shop and Forms already share one set of Firebase Auth accounts on `ppitsz-next` (ADR 0006), but each app had its own sign-in pages and its own host-only session cookies: `shop_staff` and `shop_account` in the shop, `forms_staff` in Forms. Someone who was Danus staff, a form admin and a buyer signed in three times with the same password, and a Danus member's buyer sign-in was kept apart from their staff sign-in on purpose. Roles could only be granted from the command line by someone holding the production variables. An admin portal was wanted, first to manage roles, later for the old site's control panel features (email broadcasting, oprec applications, admin status).

## Decision

A new app, PPITSZ Account (`apps/account`, `account.ppitshenzhen.org`), is the only place to sign in, sign up and reset a password, for buyers, responders and staff alike. One Firebase session cookie, `ppitsz_session`, set on `.ppitshenzhen.org`, is read by every app. Signing out anywhere signs out everywhere. The buyer profile becomes the account's profile, `accounts/{uid}`, shared by every app.

Roles stay where ADR 0004 put them, one collection per app, looked up on every request. The portal adds its own, `portalStaff/{uid}`, for Portal admins, who grant and remove every app's roles in the account app. Every change is logged in `roleChanges`.

Sign-in stays email and password through our server, so it works in China without a VPN. Forms still need no account.

## Consequences

- One password and one sign-in for everything. A role change still takes effect on the next request without signing anyone out.
- The cookie reaches every `ppitshenzhen.org` subdomain, including any future app. Only our own apps may live under that domain.
- Signed-in pages don't work on Vercel previews: `*.vercel.app` can't share a cookie. Staff and buyer flows are tested locally, where cookies ignore ports.
- Every app, locally too, connects to the same real project, `ppitsz-next` (now `ppitsz`, ADR 0013), since a session cookie only verifies against the project that issued it. Development has no emulator; only the automated tests use a throwaway one. The shared Firebase setup, session, profile and roles live in `packages/accounts` (`@ppitsz/accounts`).
- At cutover every existing session ends, and everyone signs in once more.
- A booth device signed in for the kasir is signed in to every app as that person.
- ADR 0004's consequence that removing someone keeps "their sessions in the other apps" working no longer applies: there is one session.
- Google sign-in can be added later as an extra button, but never as the only way in.
