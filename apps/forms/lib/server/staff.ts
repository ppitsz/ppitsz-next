import { ensureAccount as ensureAnyAccount } from "@ppitsz/accounts/passwords"
import { holdersOf, isFormsAdmin, organizerFormsOf, SCRIPT, setRole } from "@ppitsz/accounts/roles"
import type { Session } from "@ppitsz/accounts/session"


/*
 * Staff of Forms: form admins and each form's organizers, on their PPITSZ
 * account (ADR 0008). Signing in happens on PPITSZ Account; Forms only reads
 * the roles, on every request (docs/adr/0004). Form admins are listed in
 * roles.forms on users/{uid} (ADR 0014); organizers are listed on each form (team, teamUids).
 *
 * Portal admins make form admins in PPITSZ Account. `bun scripts/admins.ts`
 * still works, against the real project.
 */

export interface Staff {
  uid: string
  email: string
  name: string
  /** A form admin: creates forms and manages every form and its team. */
  isAdmin: boolean
}

export { isFormsAdmin }

/**
 * The staff member behind a signed-in account: a form admin, or an organizer of a
 * form that hasn't ended. Null for anyone else. Form access is checked per
 * form (lib/server/auth.ts).
 */
export async function staffOf(session: Session): Promise<Staff | null> {
  const isAdmin = await isFormsAdmin(session.uid)
  if (!isAdmin && (await organizerFormsOf(session.uid)).length === 0) return null
  return { uid: session.uid, email: session.email, name: session.name || "Organizer", isAdmin }
}

/**
 * The account for `email`, created without a password when there is none.
 * `hasPassword` says whether they can sign in already.
 */
export async function ensureAccount(email: string, name: string) {
  const account = await ensureAnyAccount(email, name)
  return { uid: account.uid, name: account.name, hasPassword: account.hasPassword }
}

/* -------------------------------------------------------------------------
   Form admins (scripts/admins.ts)
   ------------------------------------------------------------------------- */

export async function grantAdmin(uid: string, email: string, name: string) {
  await setRole(SCRIPT, { uid, email, name }, "forms", "admin")
}

export async function revokeAdmin(uid: string, email: string) {
  await setRole(SCRIPT, { uid, email, name: "" }, "forms", null)
}

export async function listAdmins() {
  return (await holdersOf("forms")).map(({ uid, email, name }) => ({ uid, email, name }))
}
