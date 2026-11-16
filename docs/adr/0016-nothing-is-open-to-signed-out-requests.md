# 16. Nothing is open to signed-out requests

Date: 2026-11-16 · Status: accepted

## Context

The old website's rules had `isServerRequest()`, true for any request without a signed-in user. Its email routes and crons used the browser's Firebase SDK on the server, signed out, so the rules let every signed-out request read every `users` record (name, email, birthday, intake year, roles), create form responses, and read and write `emailSends`. Anyone on the internet could do the same.

The email routes behind them checked no one either. `/api/emails/send` emailed anyone from PPIT Shenzhen's Gmail, `/api/emails?type=recipients` listed every active member's email and birthday, and the rest showed the email history and today's birthdays. The two email crons were broken: they posted to `null/api/emails/send`.

## Decision

- The old website's server reads and writes Firestore through the Admin SDK, as its ticket routes already did: `services/email.js`, the membership-status job (`lib/members/server.js`) and the email sending (`lib/email/deliver.js`, called directly instead of through our own API).
- Its email routes answer website admins only: the browser sends the admin's Firebase ID token (`services/adminApi.js`), checked with the same `requireAdmin` as the ticket routes. The crons keep their `CRON_SECRET`.
- The rules drop `isServerRequest()`. A signed-in member reads only their own `users` record, and website admins read everyone's. Form responses need a signed-in member. `emailSends` is for admins only.

## Consequences

- No Firestore data is readable or writable signed out, except what is public on purpose (open forms, published news, interview slots).
- The rules deploy must come after the old website's change is live, or its crons and email sender stop working until it is.
- Members can no longer see each other's records from the browser. Nothing on the old website did that apart from the admin status page, which admins use.
- WeChat ID and phone could now move from `users/{uid}/private/contact` onto the record itself (ADR 0014). They stay where they are until there's a reason to move them.
