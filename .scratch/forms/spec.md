# PPITSZ Forms: registration, forms and tickets

Status: ready-for-human

A new app, **PPITSZ Forms** (`apps/forms`, later `https://forms.ppitshenzhen.org`), for event registration with tickets and for forms in general. Decided with the user on 2026-10-28/29 (grilling session, 51 questions). See `GLOSSARY.md` (Forms) and ADRs 0003–0005.

## Phases

1. **Forms and free tickets.** Built 2026-10-29: everything under "Phase 1" below.
2. **Paid tickets.** Extract the shop's payment flow (transfer, proof upload, verification, rejection, expiry, refunds recorded), its staff sessions and its scanner into shared packages; add a price to ticket types. An unpaid ticket holds its place until its payment deadline; the ticket page shows "Menunggu pembayaran" and the QR and ticket email come after approval. Emails added: proof rejected. Door registrations can then take Tunai, WeChat or Alipay. Cancelling a paid ticket is panitia-only and records the refund; cancelling the event makes every paid ticket a refund owed.
3. **Oprec** as a form with stages (Formulir online → Tes tertulis → Wawancara → Pengumuman): written-test upload, interview booking, per-division review. Next oprec around September 2027.

Later: a public read API for the main site (open or closed, places left, close date). No shared database access.

## Phase 1: what was decided and built

**Responders**: no account. Each response has a secret link (`/tiket/<token>` or `/respons/<token>`), sent by email. Someone who lost it enters their email at `/<slug>/kembali` and gets a 6-digit code (15 minutes, 5 tries). No email verification before the ticket; the page shows it at once. No Google anywhere, so it works in China without a VPN. Spam: rate limits and a honeypot, no captcha. Indonesian UI; question text as typed.

**Rules per form**: collect name and email (off: anonymous), also WeChat ID and campus, one response per email (per device cookie when anonymous), responders may edit until the form closes (not their email or ticket type), an optional response cap. Ticket forms always collect everything and allow one live ticket per email. Registering again with the same email re-sends the existing ticket.

**Builder**: sections (one page each), questions of five types (short, long, single choice, multiple choice, file), each optionally shown only when an earlier choice question has one of the named answers. Files: JPG, PNG, WebP or PDF up to 4 MB, photos shrunk in the browser, visible only to the form's panitia. "Salin formulir" copies a form into a new draft.

**Status**: Draf, Dibuka (with optional open and close dates), Ditutup (no new responses, tickets still scan), Selesai (panitia lose access; 90 days later email, WeChat ID, text and file answers are purged, keeping name, campus, ticket type, absen and choice answers). Listed on the home page unless unlisted.

**Tickets**: venue, event days (date, optional times), optional capacity, ticket types (optional quota, optional sale dates, the days they cover). One ticket = one person = one QR, which holds the ticket URL. The ticket page is the ticket: Jaringan panel in the organising division's line, the days as a route filled in by absen, the QR and the 6-letter code. Responders cancel a free ticket themselves until the event is over or they are checked in; the place returns to the quota. Panitia can change a ticket's name (transfers), email and type.

**Door**: absen once per event day; scanning auto-records it; a repeat scan shows who and when; a type not valid that day is refused. "Daftar di tempat" makes a ticket already checked in, counting against the quotas. A printable absen list is the offline backup.

**Email** (Resend, see ADR 0005): ticket (QR inline as a CID image, `.ics` attached), plain-form receipt, access code, panitia invite (with a set-password link for new accounts), password reset, and panitia's own change or cancellation message. Queued, retried, tracked by webhook; bounces are flagged on the response for panitia to fix and resend.

**Staff** (see ADR 0004): one Firebase account per person, shared with the shop. Form admins (Firestore) create and build forms and pick panitia by email; panitia see responses (new-response count), files, the per-question summary, absen recap, CSV, scanner and messages.

## Before going live

- [x] Firebase project `ppitsz-next` (ADR 0006): Firestore and Storage in `asia-east2`, Email/Password on, service account in `.env.local` (2026-10-30).
- [ ] Deploy the rules: `firebase deploy --only firestore,storage --project ppitsz-next` from `apps/shop` (rules and the shop's indexes).
- [ ] The same five `FIREBASE_*` variables on Vercel. `FIREBASE_API_KEY` is the web config's `apiKey`.
- [ ] Resend: verify `ppitshenzhen.org` (SPF, DKIM, optionally DMARC); `RESEND_API_KEY`; the webhook to `/api/resend` with its `RESEND_WEBHOOK_SECRET`; the paid tier before a big event.
- [ ] Vercel project for `apps/forms` at `forms.ppitshenzhen.org`, `CRON_SECRET`; then `live: true` for Forms in `packages/accounts/src/urls.ts`.
- [x] Firestore TTL policy on `formRateLimits.expiresAt` and `formAccessCodes.expiresAt` (2026-10-30; kept in `apps/shop/firestore.indexes.json`).
- [ ] First form admin: `bun scripts/admins.ts add <email> "<name>"` with the production variables set.
- [ ] Try a real ticket on an iPhone and an Android phone, and the scanner at the door, before the first event.
