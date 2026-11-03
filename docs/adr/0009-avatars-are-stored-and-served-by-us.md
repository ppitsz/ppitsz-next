# 9. Avatars are stored and served by us

Date: 2026-11-03 · Status: accepted

## Context

Every app's header shows who is signed in, and it should show a photo. People should be able to choose any photo they like. Google sign-in may come later (ADR 0008), and with it the Google account's own photo, which should be used unless the person chose one. But a Google photo is a `googleusercontent.com` URL, and Google's domains don't load in mainland China without a VPN. Nothing else in our apps asks the browser to reach Google.

## Decision

The profile (`accounts/{uid}`) holds two avatar slots: `avatarPath`, the photo the person chose, and `providerAvatarPath`, our copy of a linked sign-in's photo. The one shown is the person's own, else the linked sign-in's, else their initials (`shownAvatarPath`). Removing your own photo brings the linked one back.

Photos are stored in Storage under `avatars/{uid}/`, with a new file name on every change, and served by every app from its own domain at `/avatars/…` with a year-long immutable cache. The browser shrinks a chosen photo to 512px before upload; the server takes JPEG, PNG or WebP up to 1 MB. Only PPITSZ Account edits it, on the profile page.

When Google sign-in is added, linking it downloads the Google photo on the server, stores it under `avatars/{uid}/` and sets `providerAvatarPath`. The browser never loads the Google URL.

## Consequences

- Avatars load in China like everything else, and a header never depends on another app being up.
- A photo URL never changes what it shows, so caches are never stale; the old file is deleted when it is replaced.
- Every page with the profile menu reads the profile once per request (`menuAccount`), Forms' responder pages included, which before read no session at all.
- A Google photo is a copy: if the person changes it on Google, ours changes on the next link or sign-in that refreshes it, not by itself.
