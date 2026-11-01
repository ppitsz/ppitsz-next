# 3. A ticket is a form response

Date: 2026-10-29 · Status: accepted

## Context

PPITSZ needs event registration with tickets (a QR scanned at the door for absen), and also plain forms: surveys, feedback, sign-ups without tickets, and later oprec. These could be two systems (events with tickets, and forms) or one.

## Decision

One app, `apps/forms`, and one concept: a **formulir** with an optional **Tiket** feature. With tickets on, a form gets ticket types, quotas, event days and the scanner, and each live response is one person's ticket. A ticket form always asks for name, email, WeChat ID and campus, and allows one live ticket per email.

The app only takes registrations. The event calendar belongs to the main site, which will link to each form's stable address and, later, read a small public API (open or closed, places left, close date).

## Consequences

- A survey and an event registration share the builder, the results, the CSV and the panitia model. Oprec (phase 3) becomes a form with stages instead of a third system.
- "Event" is not a stored thing. Event details (venue, days) are part of a ticket form's settings, so one event with two registrations would be two forms.
- Paid tickets (phase 2) add a price to ticket types and reuse the shop's payment flow, extracted into a shared package; a response then holds its place until its payment deadline, as a shop order holds stock.
