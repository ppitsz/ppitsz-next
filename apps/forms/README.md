# PPITSZ Forms (forms)

Registration and forms for PPI Tiongkok Cabang Shenzhen, later at `https://forms.ppitshenzhen.org`. Every form is a **form**; turning on **tickets** makes each response one person's ticket with a QR code that organizers scan for check-in. Surveys, sign-ups and anonymous feedback are forms without tickets. The app only takes registrations: the event calendar is the main site's.

Built on the Jaringan design system (`@ppitsz/ui`). Runs on port **3002** (docs 3000, shop 3001). Decisions: `.scratch/forms/spec.md`, ADRs 0003–0005, terms in `GLOSSARY.md` (Forms).

## How it works

- **Responders need no account.** Someone signed in to their PPITSZ account finds their name, email and WeChat ID filled in, and the response is linked to the account (`accountUid`), except on an anonymous form, which never reads the session. A response's secret token is still its key: `/tickets/<token>` for a ticket, `/responses/<token>` otherwise, linked from the email. Lost it? `/<slug>/find` emails a 6-digit code. The ticket page is the ticket; the email is a copy.
- **The browser never talks to Google.** Every Firebase call goes through the server with the Admin SDK; covers stream through `/media`, file answers through `/staff/files` (organizers only). Fonts are self-hosted. There is no captcha, which doesn't load in China: rate limits and a honeypot field instead.
- **Every quota, lock and check-in change runs in a Firestore transaction** (`lib/store/index.ts`). A ticket needs room in its type's quota and the form's capacity; one live ticket per email is a lock document; canceling frees both.
- **Email goes through Resend** (ADR 0005), queued in Firestore and sent right after the request; failures retry with backoff. Without `RESEND_API_KEY`, development writes each email to `.outbox/` as an HTML file (open it in a browser) with its attachments.

```
Draft ──▶ Open ──▶ Closed ──▶ Ended
         (open/close dates,    (no new responses,   (organizers lose access;
          caps: Fully booked)    tickets still scan)  purge after 90 days)
a response: live ──cancel──▶ cancelled (self, an organizer, or the event)
```

| Path | What |
|---|---|
| `lib/domain/` | Pure rules, unit-tested: `form.ts` (phases, conditions, checking answers and the fixed fields), `tickets.ts` (availability, days, self-cancel, what a scan does), `definition.ts` (the builder's draft, its schema and what a save may not break), `results.ts` (summary, check-in recap, CSV), `codes.ts` (ids, tokens, codes, reading a scan) |
| `lib/store/` | Firestore and Storage (`media.ts`), rate limits. Integration-tested against the emulator. |
| `lib/mail/` | Resend (`resend.ts`), the queue (`queue.ts`), email bodies (`templates.ts`), `.ics` files, webhook signatures |
| `lib/actions/` | Server actions: `respond.ts` (responders), `staff.ts` (sign-out, scan, door, one response), `admin.ts` (forms, status, cover, copy, organizers, messages) |
| `lib/server/` | Sessions and roles from the shared PPITSZ account (`auth.ts`, `staff.ts`, on `@ppitsz/accounts`), which email goes when (`notify.ts`), request info, alerts |
| `app/(public)/` | `/` open forms · `/[slug]` the form · `/[slug]/find` · `/tickets/[token]` (+ `/calendar`) · `/responses/[token]` (+ `/edit`) |
| `app/staff/` | `/staff/sign-in`, `forgot-password`, `reset-password` (redirects to PPITSZ Account) · `/staff/no-access` · `/staff` forms · `/staff/[formId]` Overview, `responses`, `results`, `scan`, `check-in`, `announcements`, `edit`, `organizers` · `/staff/print/[formId]` check-in list · `/staff/export/[formId]` CSV · `/staff/files/…` files |
| `app/api/` | `cron` (daily: due emails, the 90-day purge) · `resend` (delivery webhook) |

## Staff

One PPITSZ account per person, **shared with the shop**, and one sign-in on PPITSZ Account for every app (ADR 0008). Each app keeps its own roles in Firestore, not in custom claims (ADR 0004):

| Who | Can |
|---|---|
| Form admin (`roles.forms` on `users/{uid}`) | Everything: create and build forms, status, cover, copy, organizers, plus all organizer work on every form |
| Organizer (on a form's team) | That form only, until it has ended: responses and files, summary, check-in recap, CSV, scan and walk-in sign-up, fixing a response (name, email, type), resending, canceling, announcements to ticket holders and canceling the event |

A Portal admin makes form admins in PPITSZ Account (Accounts). The script still works, against the real project (the `FIREBASE_*` variables in `.env.local`), and logs its changes too. An existing account keeps its password:

```bash
bun scripts/admins.ts add nadia@example.com "Nadia"
bun scripts/admins.ts remove nadia@example.com
bun scripts/admins.ts list
```

Organizers are added on the form's Organizers page by email. Someone without an account gets one with no password and an email to set it, on PPITSZ Account's own `/reset-password` (Firebase's page needs Google).

## The door

`/staff/[formId]/scan` reads the QR with the phone camera (decoded on the phone: BarcodeDetector, or jsQR on Safari) and records a check-in for the chosen day at once. A second scan shows who checked the ticket in and when; a ticket type that doesn't cover the day is refused. The 6-letter code under the QR can be typed instead. **Walk-in sign-up** registers someone without a ticket, already checked in. Print `/staff/print/[formId]` before the event as the offline backup. The camera needs HTTPS or `localhost`; over the LAN in development, use a photo of the QR or the code.

## Local development

Development connects to the **real Firebase project**, `ppitsz`, like production: there is no emulator. It is the old website's project too (ADR 0013), so everything you do locally (orders, accounts, role changes, password resets) happens to real data the live old site also uses. Copy the `FIREBASE_*` variables into `.env.local` (the same five in the shop, Forms and PPITSZ Account).

```bash
bun run dev          # from the repo root: http://localhost:3002 (staff at /staff), PPITSZ Account on :3003 for signing in
bun run test         # domain and mail units
bun run test:emulator  # store transactions against a throwaway emulator (never the real project; needs Java 21+)
```

Emails land in `.outbox/` without `RESEND_API_KEY`; the invite page also shows the link.

## Production

Same Firebase project as the shop and the old website (`ppitsz`, ADR 0013). Forms keeps its forms in `formDefs`, since the old website already has `forms`. Environment (see `.env.example`): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_API_KEY` (the web config's `apiKey`), `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `MAIL_FROM_TICKET`, `MAIL_FROM_DEFAULT`, `CRON_SECRET`, optionally `ALERT_WEBHOOK_URL`. No URLs: it is `forms.ppitshenzhen.org` and finds the other apps by name (ADR 0010). Mark it `live` in `packages/accounts/src/urls.ts` once it is deployed, so the other apps link to it.

- **Resend**: verify `ppitshenzhen.org` (SPF and DKIM records), point a webhook at `/api/resend` for `email.sent`, `delivered`, `delivery_delayed`, `bounced`, `complained` and `failed`. The free tier sends about 100 emails a day: use the paid tier in event season.
- **Cron**: `vercel.json` runs `/api/cron` daily (the Hobby plan's limit). Emails don't wait for it, and every staff page load nudges the queue too; on the Pro plan, run it every 5 minutes.
- **Firestore**: no browser can reach Forms' collections. The project has one ruleset, shared with the shop and the old website, deployed from the repo's `firebase/` folder only (ADR 0013); its `firestore.indexes.json` also holds the project's indexes and the TTL policies on `formRateLimits.expiresAt` and `formAccessCodes.expiresAt`. This app's `storage.rules` is for the test emulator only. Queries use equality filters only, so Forms needs no composite indexes.
