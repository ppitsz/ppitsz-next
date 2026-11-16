# 12. One voice, no insider words

Date: 2026-11-13 · Status: accepted · Amends ADR 0007

## Context

ADR 0007 kept four Indonesian insider words in the English UI: Panitia, Danus, Oprec and Kasir. In practice they made the apps read as if a buyer were dealing with a division rather than with PPIT Shenzhen ("Danus checks your transfer proof", "Danus's backup"), and they left English-only readers (and new members) with words the screen never explains. Each one has a plain English word that members already understand.

## Decision

1. **The UI speaks as "we".** PPIT Shenzhen is one organization: copy never names a division as the one acting. Buyers read "We check your transfer proof" and "Contact us". Staff copy names the app's roles ("shop admin", "shop staff"). The shop's footer no longer credits a division.
2. **No insider words.** Panitia → **organizers** (one person is an organizer of a form). Kasir → **Register** (the booth screen, `/staff/register`). Oprec → **recruitment**. Danus stays only as a division's proper name, in the network data and the line badge.
3. **Identifiers follow the screen**, as ADR 0007 says: `organizer`, `organizing`, `OrganizedForm`, `organizerFormsOf`, `register`, `RECRUITMENT_STAGES`, `StatusBadge domain="recruitment"`. A division's line code (`danus`) is a proper name and stays.

Proper names and the organization's own prose (ADR 0007, tests 1 and 3) are unchanged.

## Consequences

- `/staff/kasir` redirects permanently to `/staff/register`, so booth phones' bookmarks keep working. Forms hadn't launched, so `/staff/[formId]/panitia` became `/staff/[formId]/organizers` without a redirect, and a response's stored `cancelledBy: "panitia"` became `"organizer"`.
- Sales undone before the change keep their stored cancel reason "Undone at the kasir"; new ones say "Undone at the register".
- The shop keeps the Danus line (its color, stripe and badge): that is the design system's map, not a voice.
- Earlier ADRs and specs keep the words they were written with.
