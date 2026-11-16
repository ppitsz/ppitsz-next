# 14. One record per person, shared with the old website

Date: 2026-11-16 · Status: accepted, supersedes where ADR 0004 stores roles and where ADR 0008 stores the profile

## Context

Since ADR 0013 the apps share `ppitsz` with the old website, and with it one set of accounts. Each side still kept its own record of a person: the old website's `users/{uid}` (name, birthday, intake year, its `admin` flag, membership status) and our `accounts/{uid}` (name, WeChat ID, phone, photos), with roles in three more collections (`shopStaff`, `formsStaff`, `portalStaff`). A name changed on one side didn't reach the other, and the old website's admins were managed apart from every other role. The organization wants one record and one role system before the new main website exists, not a migration later. On 2026-11-16 `accounts` was still empty on `ppitsz`, and the role collections held one person.

The old website reads and writes `users/{uid}` from the browser, and its rules let any signed-in person read every record (and, through `isServerRequest()`, anyone at all). Its create rule also let anyone make their own record with `admin: true`; that was fixed the same day.

## Decision

`users/{uid}` is the one record per person, for every app and the old website.

- The old website's fields stay as they are: `email`, `name`, `birthday` ("YYYY-MM-DD"), `cohortYear` (a number), `admin`, `status`, `graduated`, `createdAt`, `lastLogin`, `submittedForms`, `attendedForms`. Ours are added beside them: `avatarPath`, `providerAvatarPath`, `updatedAt`, `roles`.
- WeChat ID and phone go in `users/{uid}/private/contact`. No rule matches it, so browsers can't read it while the old rules open `users/{uid}`.
- Roles are fields on the record: `roles.shop` ("admin" or "booth"), `roles.forms` and `roles.portal` ("admin"). Website admin is the old website's own `admin: true`, kept in its place because its rules and pages read it. Portal admins grant all four in PPITSZ Account; every change is still logged in `roleChanges`. ADR 0004's other choices stand: no custom claims, a role per app, read on every request.
- The rules (`firebase/firestore.rules`) refuse a browser that creates its own record as an admin or with roles, and any browser change to `roles`.
- A record we make has the old website's sign-up shape (not an admin, active, no forms), so its pages and email jobs read it like their own.
- Sign-up on PPITSZ Account asks for birthday and intake year, as the old website did. An account that comes without them (a new Google sign-in, a staff account made by a script) is asked for them once, after signing in, on `/finish-profile`.
- Every sign-in sets `lastLogin` and `status: "active"`, as the old website does, since it marks people inactive after years without one.

## Consequences

- One name, birthday and intake year for both websites, and one place to manage every role, the old website's admins included. Nothing moved: the old records were already the right ones.
- Our apps depend on the old website's field names until it is retired. Renaming one breaks both.
- Reading a profile takes two documents (the record and its contact). Role checks still take one.
- Everyone with a role can be seen by any signed-in browser through the old rules, as the old `admin` flag always could. WeChat ID and phone can't. (Since ADR 0016, members read only their own record.)
- Once the old website's email jobs stop reading `users` while signed out and its rules let people read only their own record, WeChat ID and phone can move onto the record itself. (Possible since ADR 0016.)
- The old website's own admin page still turns `admin` on and off, logged in its `adminHistory`, not in `roleChanges`.
- Shop buyers are asked for a birthday and intake year like everyone else.
