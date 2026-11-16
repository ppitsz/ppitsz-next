# 15. The old website signs in through PPITSZ Account

Date: 2026-11-16 · Status: accepted

## Context

Since ADR 0013 and 0014 the old website shares accounts and `users/{uid}` with our apps, but it kept its own sign-in: a Google pop-up and its own onboarding, asking for the same name, birthday and intake year our sign-up asks for. Someone signed in to the shop was still signed out of the old website, and could only sign in there with Google.

The old website's pages read Firestore from the browser with the Firebase client SDK and wait for its signed-in user (`onAuthStateChanged`). Its form submission reads the uid from `localStorage["user-id"]`. Rewriting those pages isn't worth it before the new main website replaces them.

## Decision

The old website has no sign-in of its own. Its `/login` sends people to PPITSZ Account and back. A small bridge then signs its Firebase client in as the same account:

- Our session cookie is set on `.ppitshenzhen.org`, so it reaches `www.ppitshenzhen.org`. A route there (`/api/account/session`) checks it with the Admin SDK, as our apps do, and answers with a Firebase custom token for that account.
- The browser signs its Firebase client in with that token and sets `localStorage["user-id"]`. Every old page then works as it did after a Google sign-in.
- The route answers only same-origin requests, so another site can't get a token out of someone's cookie.
- A token is only given for a complete profile. Otherwise `/login` sends the person through Account's sign-in, which asks for what's missing on `/finish-profile` (ADR 0014). The old onboarding pop-up is no longer shown.
- On each page load the old website compares its client with the cookie. It signs in when the cookie is someone else's or the client is signed out, and signs out when the cookie is gone. Signing in or out in any app carries over.
- Signing out on the old website clears the cookie too (`/api/account/sign-out`), so it signs out of every app, as signing out anywhere else does.
- `safeNext` accepts `https://www.<root domain>` (`siteOrigin()`; `localhost:3004` in development) as a place to return to. The old website isn't in `APPS` and gets no Transfer link.

## Consequences

- One sign-in for everything, with email and password or Google. People who sign up on the old website get the same record as our apps make.
- The old website still uses the Firebase client SDK and its own rules. This changes only how it signs in.
- An old website page that sends signed-out people to `/login` may do so for a moment on someone's first visit, before the bridge has signed the client in. `/login` returns them to the page they came from.
- The old website depends on the cookie's name (`ppitsz_session`) and attributes. Changing them here breaks its sign-in and sign-out.
- The bridge is removed with the old website.
