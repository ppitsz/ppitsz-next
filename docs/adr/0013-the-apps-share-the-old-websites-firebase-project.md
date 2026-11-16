# 13. The apps share the old website's Firebase project

Date: 2026-11-14 · Status: accepted, supersedes ADR 0006

## Context

ADR 0006 put the shop, Forms and PPITSZ Account on a new project, `ppitsz-next`, away from the old website's `ppitsz`. The organization wants one project for everything, without a data migration first. `ppitsz-next` held only test data: 2 accounts, both also in `ppitsz` with the same email, and a test campaign with 2 orders.

What ADR 0006 was worried about, checked against `ppitsz` on 2026-11-14:

- Its Firestore is Standard edition, `(default)`, in Hong Kong (`asia-east2`), the same as `ppitsz-next`.
- Its rules match the old site's collections one by one (`forms`, `users`, `applications`, `news`, …), with no rule for every document. Any other collection is closed to browsers without a rule of ours.
- Only `forms` collides: the old site keeps its forms there, readable by anyone.
- Its Auth already holds the old site's 764 accounts, with email/password sign-in on.
- It had no Storage: the old site keeps its images on Cloudinary.

## Decision

Every app uses `ppitsz`, in production and in development. The old site keeps its collections, its rules and its indexes; the rules and indexes now live in this repo.

- Forms keeps its form documents in `formDefs`, not `forms`.
- The project's Firestore rules, the old site's included, are kept in this repo, `firebase/firestore.rules`, and deployed from `firebase/` only. The old site's repo no longer deploys them. Our collections need no rule: the Admin SDK bypasses rules, and the old site's rules name their collections one by one, so ours stay closed. `apps/shop/firestore.rules` is for the test emulator only.
- `firebase/firestore.indexes.json` lists the old site's composite indexes as well as ours, so deploying it never offers to delete theirs. An index the old site needs must be added there.
- Storage on `ppitsz` is ours alone: the deny-all `storage.rules` are deployed there, and files are served through each app's own routes, as before.
- A new collection must not reuse a name the old site has (`adminHistory`, `applications`, `applicationsCounter`, `birthdayTemplates`, `emailSends`, `emailSettings`, `forms`, `interviewTimeSlot`, `metadata`, `news`, `responses`, `ticketHolders`, `tickets`, `users`).

## Consequences

- One Auth pool. The old site signs in with Google only, so its accounts have no password: they get into PPITSZ Account through our Google sign-in (ADR 0011), which finds the same account by its Google account, not by the OAuth client, and can then add a password. Profiles and roles moved onto the old `users/{uid}` too (ADR 0014). Disabling an account affects the old site too.
- Development reads and writes the live old site's data. Local runs need the same care as production; the automated tests still use only the throwaway emulator.
- The project-wide Auth settings (authorized domains, email templates, password policy) are shared with the old site. Change them knowing both sites use them.
- A Firestore rules deploy replaces whatever is live. Anyone with an old copy of the rules must not deploy it; change `firebase/firestore.rules` instead.
- No app uses `ppitsz-next`'s Firestore, Auth or Storage any more. Its Google Cloud project still holds the OAuth client for Google sign-in (ADR 0011), which works from there, so it stays until that client is moved.
