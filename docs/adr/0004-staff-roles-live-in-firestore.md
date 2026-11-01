# 4. Staff roles live in Firestore, not in custom claims

Date: 2026-10-29, shop added 2026-10-30 · Status: accepted, sessions superseded by ADR 0008

> Roles still live per app, as below. Sessions no longer do: one sign-in on PPITSZ Account covers every app (ADR 0008), and Portal admins (`portalStaff`) grant roles in the app.

## Context

Forms and the shop share the `ppitsz-next` Firebase project (ADR 0006), so one person has one account and one password for both, and more apps may join. The shop first kept its staff role (`admin`, `booth`) as a custom claim, set with `setCustomUserClaims(uid, { role })`, which replaces the whole claims object: a role from any other app stored as a claim would be wiped every time the shop's script touched that account. Claims also only change in a session after its token is refreshed, so the shop revoked every session on a role change, which signed the person out of Forms too.

## Decision

Each app keeps its roles in Firestore, one collection per app, keyed by the account's uid, with the same shape `{ role, email, name }`:

- Shop: `shopStaff/{uid}`, role `admin` or `booth`.
- Forms: `formsStaff/{uid}`, role `admin`, for form admins. Panitia are listed on each form (`team`, and `teamUids` for queries).

No app sets custom claims. Sign-in checks the password through the Identity Toolkit, and the session cookie only proves who someone is; every page and action looks up what they may do.

## Consequences

- No app can erase another's roles, and a role in one app grants nothing in another.
- One Firestore read per request for the role check. Removing someone or changing their role works on the next request without signing anyone out, so their sessions in the other apps keep working.
- Adding a role to an existing account keeps its password. Resetting a password is its own step (`scripts/staff.ts password`, or the apps' "lupa sandi" pages), and it does sign the account out everywhere.
- A future account page can show and edit everyone's roles across apps by reading these collections.
