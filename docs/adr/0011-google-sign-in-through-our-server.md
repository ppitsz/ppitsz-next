# 11. Google sign-in goes through our server

Date: 2026-11-12 · Status: accepted

## Context

People asked to sign in with Google, and to rescue an account whose password they forgot: the password reset email links to Firebase's own page on `firebaseapp.com`, because Firebase no longer lets this project change the reset email's action URL (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, in the console and the API). That page needs a VPN in mainland China, like Google itself.

ADR 0008 allows Google sign-in as an extra button, never as the only way in. Firebase's own Google sign-in runs in the browser with the Firebase SDK, which every app avoids (browsers never call Firebase), and its "one account per email" rules remove an unverified account's password when Google signs in to it.

## Decision

PPITSZ Account runs the OAuth flow itself. "Continue with Google" (`/auth/google`) sends the browser to Google with state, a nonce and PKCE, kept in a ten-minute cookie; Google sends it back to `/auth/google/callback`, where our server trades the code for Google's ID token with the client secret and checks its claims. Only a verified email is accepted.

The Admin SDK then decides and links (`planGoogle` in `@ppitsz/accounts/google`):

- a Google account already linked signs in to its account;
- otherwise, an account with the same email gets Google linked and is signed in, since Google proved the inbox, the same proof a reset link gives; its password keeps working;
- otherwise, a new account is made without a password;
- signed in, the profile page links Google to the current account, unless another account has that Google account.

The session is the same `ppitsz_session` cookie as a password sign-in, made from a custom token, so every app and every role check stay unchanged. The Google photo is copied to our storage as the linked photo (ADR 0009).

An account without a password can add one on its profile page. Google can be unlinked only from an account with a password.

## Consequences

- Signing in with Google needs a VPN in mainland China, as Google does; the button says so. Email and password stay the way in that works without one.
- Someone who forgot their password and can reach Google gets back in without the reset email.
- An account made by someone else with your email, before you signed in with Google, keeps that person's password after the link. Accounts were never email-verified, so this was already possible through the reset email.
- The OAuth client lives in the `ppitsz-next` Google Cloud project; `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on PPITSZ Account only. Without them the button is hidden.
