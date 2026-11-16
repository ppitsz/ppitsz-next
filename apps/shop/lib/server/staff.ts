import { generatePassword } from "@ppitsz/accounts/fields"
import { ensureAccount, findAccount, setPassword } from "@ppitsz/accounts/passwords"
import { holdersOf, logPasswordReset, SCRIPT, setRole, shopRoleOf } from "@ppitsz/accounts/roles"
import type { Session } from "@ppitsz/accounts/session"

import { adminAuth } from "../firebase/admin"
import { isStaffRole, type StaffRole } from "../staff-roles"

export { STAFF_ROLE_LABELS, STAFF_ROLES, type StaffRole } from "../staff-roles"

/*
 * shop staff: a PPITSZ account (ADR 0008) with a shop role on users/{uid} (ADR 0014).
 * Signing in happens on PPITSZ Account; the shop only reads the role, on
 * every request, so a change takes effect at once (docs/adr/0004).
 *
 * Portal admins give and remove roles in PPITSZ Account. `bun scripts/staff.ts`
 * (add, password, remove, list) still works, against the real project.
 */

export interface Staff {
  uid: string
  email: string
  name: string
  role: StaffRole
}

/** The staff member behind a signed-in account, or null when the account has no shop role. */
export async function staffOf(session: Session): Promise<Staff | null> {
  const record = await shopRoleOf(session.uid)
  if (!record) return null
  return { uid: session.uid, email: session.email, name: record.name || session.name || "Staff", role: record.role }
}

/* -------------------------------------------------------------------------
   Managing accounts (scripts/staff.ts and tests)
   ------------------------------------------------------------------------- */

/**
 * Gives the account for `email` a shop role. A new account gets `password`;
 * an existing one (a Forms organizer, a buyer) keeps its own, so adding someone
 * never locks them out of the other apps. `created` says which happened.
 */
export async function upsertStaff(input: { email: string; password: string; name: string; role: StaffRole }) {
  const account = await ensureAccount(input.email, input.name, input.password)
  await setRole(SCRIPT, { uid: account.uid, email: input.email, name: input.name }, "shop", input.role)
  return { uid: account.uid, created: account.created }
}

/**
 * Sets a new password and signs the account out everywhere, every app
 * included: for a lost password or a booth phone that changed hands.
 */
export async function setStaffPassword(email: string, password = generatePassword()) {
  const user = await adminAuth().getUserByEmail(email)
  await setPassword(user.uid, password)
  await logPasswordReset(SCRIPT, { uid: user.uid, email, name: user.displayName ?? "" })
}

/** Takes away the role. Their staff pages stop on the next request; the account itself is untouched. */
export async function removeStaff(email: string) {
  const account = await findAccount(email)
  if (!account) throw new Error(`No account with ${email}`)
  await setRole(SCRIPT, account, "shop", null)
}

export async function listStaff(): Promise<Staff[]> {
  const holders = await holdersOf("shop")
  return holders.flatMap((h) => (isStaffRole(h.role) ? [{ uid: h.uid, email: h.email, name: h.name, role: h.role }] : []))
}

/** Display names for the uids stored on orders ("approved by …"). */
export async function staffNames(uids: (string | null | undefined)[]) {
  const unique = [...new Set(uids.filter((u): u is string => !!u))]
  const names = new Map<string, string>()
  if (unique.length === 0) return names
  const { users } = await adminAuth().getUsers(unique.map((uid) => ({ uid })))
  for (const user of users) names.set(user.uid, user.displayName ?? user.email ?? user.uid)
  return names
}
