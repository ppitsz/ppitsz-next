# 6. The new apps get their own Firebase project

Date: 2026-10-30 · Status: superseded by ADR 0013

## Context

The old website runs on the `ppitsz` Firebase project. Its browser pages use the client SDK, so its security rules open several collections to the browser, and it already keeps its own forms in `forms`, readable by anyone. Forms and the shop were going to share that project. Forms would then have read the old site's form documents as its own, its form documents (with the panitia's emails) would have been public through the old rules, and our deny-all rules could not be deployed without breaking the old site.

## Decision

Forms and the shop share a new project, `ppitsz-next`: Firestore (Standard edition, database `(default)`) and Storage in Hong Kong (`asia-east2`), Email/Password sign-in. Its rules deny all client access. The old site stays on `ppitsz` until it is retired.

## Consequences

- No collection names to avoid, and the deny-all rules can be deployed from either app.
- Staff accounts are not shared with the old site: staff get new accounts here (`admins.ts`, a panitia invite, the shop's staff script).
- Old data (Auth users with their password hashes, `applications`, old forms) can be copied over later with `firebase auth:export`/`auth:import` and an Admin SDK script, for example when Oprec moves here.
- The project was created with a personal Google account. Handover: add the PPIT account as Owner, move billing to its billing account, then remove the personal account.
