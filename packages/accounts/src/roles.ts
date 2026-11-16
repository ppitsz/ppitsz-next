import { FieldValue, Timestamp, type DocumentSnapshot, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore"

import { adminAuth, db } from "./firebase"
import { newPersonDoc, people } from "./profile"
import { isShopRole, SHOP_ROLES, type RoleApp, type ShopRole } from "./role-labels"

/*
 * Roles live on the person's record, users/{uid} (ADR 0014):
 *
 *   roles.shop     "admin" or "booth" (the shop)
 *   roles.forms    "admin" (form admins)
 *   roles.portal   "admin" (Portal admins, ADR 0008)
 *   admin: true    website admin: the old website's own flag, which its rules
 *                  and control panel read, so it keeps its name and place
 *
 * Browsers can't write `roles`, nor give themselves `admin` (firebase/
 * firestore.rules); only this module does, on the server. The old website's
 * admin page still turns `admin` on and off for other admins, as before.
 *
 * Organizers are not a role: each form lists its own (team, teamUids).
 *
 * Every change made here is logged in roleChanges/{id}, with who made it.
 * The apps read the record on every request, so a change takes effect at
 * once without signing anyone out.
 */

export interface Actor {
  uid: string
  email: string
  name: string
}

/** The staff scripts, as the change log shows them. */
export const SCRIPT: Actor = { uid: "script", email: "", name: "Script" }

export interface Target {
  uid: string
  email: string
  name: string
}

export interface OrganizedForm {
  id: string
  title: string
  status: string
}

/** The roles stored on a record. */
export interface AppRoles {
  shop: ShopRole | null
  formsAdmin: boolean
  portalAdmin: boolean
  siteAdmin: boolean
}

export interface Roles extends AppRoles {
  /** Forms they organize that haven't ended. */
  organizing: OrganizedForm[]
}

export interface RoleChange {
  id: string
  at: Date
  by: Actor
  target: { uid: string; email: string }
  kind: "role" | "passwordReset"
  app: RoleApp | null
  from: string | null
  to: string | null
}

/** A refusal to show the Portal admin, such as removing the last one. */
export class RoleError extends Error {}

const changes = () => db().collection("roleChanges")

/** Where each app's role sits on users/{uid}. */
const FIELDS: Record<RoleApp, string> = { shop: "roles.shop", forms: "roles.forms", portal: "roles.portal", site: "admin" }

/** One app's role on a record: a shop role, "admin", or null. */
function roleIn(snap: DocumentSnapshot, app: RoleApp): string | null {
  if (!snap.exists) return null
  if (app === "site") return snap.get("admin") === true ? "admin" : null
  const role: unknown = snap.get(FIELDS[app])
  if (app === "shop") return isShopRole(role) ? role : null
  return role === "admin" ? "admin" : null
}

function rolesFromDoc(snap: DocumentSnapshot): AppRoles {
  return {
    shop: roleIn(snap, "shop") as ShopRole | null,
    formsAdmin: roleIn(snap, "forms") === "admin",
    portalAdmin: roleIn(snap, "portal") === "admin",
    siteAdmin: roleIn(snap, "site") === "admin",
  }
}

/* -------------------------------------------------------------------------
   Reading
   ------------------------------------------------------------------------- */

/** The account's shop role and its name, or null when it isn't shop staff. */
export async function shopRoleOf(uid: string): Promise<{ role: ShopRole; name: string } | null> {
  const snap = await people().doc(uid).get()
  const role = roleIn(snap, "shop") as ShopRole | null
  return role ? { role, name: (snap.get("name") as string | undefined) ?? "" } : null
}

export async function isFormsAdmin(uid: string) {
  return roleIn(await people().doc(uid).get(), "forms") === "admin"
}

export async function isPortalAdmin(uid: string) {
  return roleIn(await people().doc(uid).get(), "portal") === "admin"
}

/** The forms `uid` organizes that haven't ended. */
export async function organizerFormsOf(uid: string): Promise<OrganizedForm[]> {
  const snap = await db().collection("formDefs").where("teamUids", "array-contains", uid).get()
  return snap.docs
    .filter((d) => d.get("status") !== "done")
    .map((d) => ({ id: d.id, title: (d.get("title") as string | undefined) ?? "", status: d.get("status") as string }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export async function rolesOf(uid: string): Promise<Roles> {
  const [snap, organizing] = await Promise.all([people().doc(uid).get(), organizerFormsOf(uid)])
  return { ...rolesFromDoc(snap), organizing }
}

/** The records holding a role in `app`. */
function holdersQuery(app: RoleApp) {
  if (app === "site") return people().where("admin", "==", true)
  if (app === "shop") return people().where(FIELDS.shop, "in", [...SHOP_ROLES])
  return people().where(FIELDS[app], "==", "admin")
}

/** Everyone with a role in `app`, by name: for the staff scripts' lists. */
export async function holdersOf(app: RoleApp): Promise<(Target & { role: string })[]> {
  const snap = await holdersQuery(app).get()
  return snap.docs
    .map((d) => {
      const email = (d.get("email") as string | undefined) ?? ""
      return { uid: d.id, email, name: (d.get("name") as string | undefined) || email, role: roleIn(d, app)! }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface StaffAccount extends Roles {
  uid: string
  email: string
  name: string
}

/** Every account that has a role, or organizes a form that hasn't ended, by name. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const [shop, forms, portal, site, openForms] = await Promise.all([
    holdersQuery("shop").get(),
    holdersQuery("forms").get(),
    holdersQuery("portal").get(),
    holdersQuery("site").get(),
    db().collection("formDefs").where("status", "in", ["draft", "open", "closed"]).get(),
  ])
  const accounts = new Map<string, StaffAccount>()
  const blank = (uid: string): StaffAccount => ({
    uid,
    email: "",
    name: "",
    shop: null,
    formsAdmin: false,
    portalAdmin: false,
    siteAdmin: false,
    organizing: [],
  })
  for (const doc of [...shop.docs, ...forms.docs, ...portal.docs, ...site.docs]) {
    if (accounts.has(doc.id)) continue
    accounts.set(doc.id, {
      ...blank(doc.id),
      email: (doc.get("email") as string | undefined) ?? "",
      name: (doc.get("name") as string | undefined) ?? "",
      ...rolesFromDoc(doc),
    })
  }
  for (const form of openForms.docs) {
    const team = (form.get("team") as { uid: string; email: string; name: string }[] | undefined) ?? []
    for (const member of team) {
      let account = accounts.get(member.uid)
      if (!account) {
        account = { ...blank(member.uid), email: member.email, name: member.name }
        accounts.set(member.uid, account)
      }
      account.organizing.push({ id: form.id, title: (form.get("title") as string | undefined) ?? "", status: form.get("status") as string })
    }
  }

  // The names and emails stored with the roles can be old; the account's own win.
  const uids = [...accounts.keys()]
  for (let i = 0; i < uids.length; i += 100) {
    const { users } = await adminAuth().getUsers(uids.slice(i, i + 100).map((uid) => ({ uid })))
    for (const user of users) {
      const account = accounts.get(user.uid)!
      account.email = user.email ?? account.email
      account.name = user.displayName || account.name || account.email
    }
  }
  return [...accounts.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
}

/* -------------------------------------------------------------------------
   Changing
   ------------------------------------------------------------------------- */

function logChange(tx: Transaction, change: Omit<RoleChange, "id" | "at">, now: Date) {
  tx.set(changes().doc(), { ...change, at: Timestamp.fromDate(now) })
}

/**
 * Sets one app's role for `target`: a shop role, "admin" for the others, or
 * null to take it away. Logs the change, unless nothing changed. Makes the
 * person's record when they have none. A Portal admin can't take away their
 * own Portal admin role, and the last Portal admin can't be removed, so the
 * portal can't be locked.
 */
export async function setRole(actor: Actor, target: Target, app: RoleApp, role: string | null, now = new Date()) {
  if (app === "shop" ? role !== null && !isShopRole(role) : role !== null && role !== "admin") {
    throw new RoleError(`"${role}" isn't a role here.`)
  }
  const ref = people().doc(target.uid)
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const from = roleIn(snap, app)
    if (app === "portal" && from === "admin" && role === null) {
      if (actor.uid === target.uid) throw new RoleError("You can't remove your own Portal admin role. Ask another Portal admin.")
      const all = await tx.get(holdersQuery("portal"))
      if (all.size <= 1) throw new RoleError("This is the last Portal admin. Make someone else a Portal admin first.")
    }
    if (from === role) return

    const value = app === "site" ? role === "admin" : (role ?? FieldValue.delete())
    if (snap.exists) {
      tx.update(ref, { [FIELDS[app]]: value })
    } else {
      const record = newPersonDoc({ email: target.email, name: target.name }, {}, now)
      if (app === "site") record.admin = role === "admin"
      else if (role !== null) record.roles = { [app]: role }
      tx.set(ref, record)
    }
    logChange(tx, { by: actor, target: { uid: target.uid, email: target.email }, kind: "role", app, from, to: role }, now)
  })
}

/** Logs that `actor` set a new password for `target`. The password itself is never stored. */
export async function logPasswordReset(actor: Actor, target: Target, now = new Date()) {
  await db().runTransaction(async (tx) => {
    logChange(tx, { by: actor, target: { uid: target.uid, email: target.email }, kind: "passwordReset", app: null, from: null, to: null }, now)
  })
}

function changeFromDoc(doc: QueryDocumentSnapshot): RoleChange {
  const d = doc.data()
  return {
    id: doc.id,
    at: (d.at as Timestamp).toDate(),
    by: d.by as Actor,
    target: d.target as RoleChange["target"],
    kind: d.kind === "passwordReset" ? "passwordReset" : "role",
    app: (d.app as RoleApp | undefined) ?? null,
    from: (d.from as string | undefined) ?? null,
    to: (d.to as string | undefined) ?? null,
  }
}

/** The newest changes of every account. */
export async function latestRoleChanges(limit = 10): Promise<RoleChange[]> {
  const snap = await changes().orderBy("at", "desc").limit(limit).get()
  return snap.docs.map(changeFromDoc)
}

/** One account's changes, newest first. Sorted here, so no composite index is needed; there are few per person. */
export async function roleChangesOf(uid: string): Promise<RoleChange[]> {
  const snap = await changes().where("target.uid", "==", uid).get()
  return snap.docs.map(changeFromDoc).sort((a, b) => b.at.getTime() - a.at.getTime())
}
