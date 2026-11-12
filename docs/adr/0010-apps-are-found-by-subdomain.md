# 10. Apps are found by subdomain, not by URL variables

Date: 2026-11-12 · Status: accepted

## Context

Every app linked to the others through its own environment variables: `ACCOUNT_URL` in the shop and Forms, `SHOP_URL` and `FORMS_URL` in the account app, `SITE_URL` for an app's own links, and `SESSION_COOKIE_DOMAIN` for the shared sign-in (ADR 0008). Each new app meant a new variable in every other app's Vercel project and `turbo.json`, and a variable missing in production silently linked to `localhost`. Yet every app already follows one pattern, `<app>.ppitshenzhen.org`.

## Decision

`packages/accounts/src/urls.ts` lists the apps (`APPS`): each one's subdomain, dev port, label and whether it is `live`. An app's origin is `https://<subdomain>.<root>`, where the root is:

- `ROOT_DOMAIN` when set, to move every app at once (a preview branch at `preview.ppitshenzhen.org`, say);
- else `ppitshenzhen.org` on Vercel;
- else none: locally each app is `http://localhost:<port>`, and an app's own links follow the host it was opened on, so a phone on the LAN gets working links.

The session cookie's domain is `.<root>`. Sign-in redirects stay limited to the listed live apps, one by one, never "any subdomain": a forgotten DNS record pointing at someone else's host must not become a redirect target.

Whether an app is linked to in production is its `live` flag, changed in a commit, no longer whether a variable happens to be set.

## Consequences

- A new app is one entry in `APPS`; no other project changes.
- Production needs no URL variables. `SESSION_COOKIE_DOMAIN`, `ACCOUNT_URL`, `SHOP_URL`, `FORMS_URL` and `SITE_URL` can be deleted from Vercel.
- Every app must live at `<subdomain>.<root>`. One that can't would need its own override, added then.
- A preview root is a subdomain of `ppitshenzhen.org`, so the production cookie (on `.ppitshenzhen.org`) reaches it too, under the same name. Someone signed in on production is signed in on the preview, and signing out there doesn't sign them out of production.
- `*.vercel.app` deploys still link to production's apps and can't sign in (ADR 0008).
