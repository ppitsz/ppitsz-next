# 5. Email goes through Resend, never through Google

Date: 2026-10-29 · Status: accepted

## Context

Forms emails tickets, receipts, access codes, panitia invites and password links. Sending through a Google account (Gmail API with OAuth) was the first idea. Firebase can also send its own password reset email.

## Decision

Every email goes through Resend's HTTP API from `ppitshenzhen.org`: tickets from `tiket@`, everything else from `noreply@`. Emails are queued in Firestore (`formMails`), sent right after the request that queued them, retried with backoff, and their delivery (delivered, bounced, complained) comes back through Resend's signed webhook and shows on the response.

Password links are made with the Admin SDK (`generatePasswordResetLink`), and only their code is kept: the email links to our own `/staf/atur-sandi`.

## Consequences

- No Google OAuth tokens to keep alive, and no Gmail sending limits. The domain needs Resend's DNS records (SPF, DKIM), and event season needs Resend's paid tier (the free tier is about 100 emails a day).
- Firebase's reset email can't be used: the project's template points at the shop's page, and Firebase's own page needs Google, which is blocked in China.
- A bounce is visible to panitia, who fix the address and resend. The ticket page stays the real ticket either way.
