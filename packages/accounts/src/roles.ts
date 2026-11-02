import { Timestamp, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore"

import { adminAuth, db } from "./firebase"
import { isShopRole, type RoleApp, type ShopRole } from "./role-labels"

/*
 * Roles stay per app (ADR 0004), one collection each, keyed by uid, shaped
 * { role, email, name }:
 *
 *   shopStaff/{uid}     role "admin" or "booth" (Danus)
 *   formsStaff/{uid}    role "admin" (form admins)
 *   portalStaff/{uid}   role "admin" (Portal admins, ADR 0008)
 *
 * Panitia are not a role: each form lists its own (team, teamUids).
 *
 * Every change made here is logged in roleChanges/{id}, with who made it.
 * The apps read their own role on every request, so a change takes effect at
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

export interface PanitiaForm {
  id: string
  title: string
  status: string
}

export interface Roles {
  shop: ShopRole | null
  formsAdmin: boolean
  portalAdmin: boolean
  /** Forms they're panitia of that haven't ended. */
  panitia: PanitiaForm[]
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

const COLLECTIONS: Record<RoleApp, string> = { shop: "shopStaff", forms: "formsStaff", portal: "portalStaff" }
const roleDocs = (app: RoleApp) => db().collection(COLLECTIONS[app])
const changes = () => db().collection("roleChanges")

/* -------------------------------------------------------------------------
   Reading
   ------------------------------------------------------------------------- */

/** The account's Danus role and the name it was given, or null when it isn't Danus staff. */
export async function shopRoleOf(uid: string): Promise<{ role: ShopRole; name: string } | null> {
  const snap = await roleDocs("shop").doc(uid).get()
  const role: unknown = snap.get("role")
  return snap.exists && isShopRole(role) ? { role, name: (snap.get("name") as string | undefined) ?? "" } : null
}

export async function isFormsAdmin(uid: string) {
  const snap = await roleDocs("forms").doc(uid).get()
  return snap.exists && snap.get("role") === "admin"
}

export async function isPortalAdmin(uid: string) {
  const snap = await roleDocs("portal").doc(uid).get()
  return snap.exists && snap.get("role") === "admin"
}

/** The forms `uid` is panitia of that haven't ended. */
export async function panitiaFormsOf(uid: string): Promise<PanitiaForm[]> {
  const snap = await db().collection("forms").where("teamUids", "array-contains", uid).get()
  return snap.docs
    .filter((d) => d.get("status") !== "done")
    .map((d) => ({ id: d.id, title: (d.get("title") as string | undefined) ?? "", status: d.get("status") as string }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export async function rolesOf(uid: string): Promise<Roles> {
  const [shop, formsAdmin, portalAdmin, panitia] = await Promise.all([
    shopRoleOf(uid),
    isFormsAdmin(uid),
    isPortalAdmin(uid),
    panitiaFormsOf(uid),
  ])
  return { shop: shop?.role ?? null, formsAdmin, portalAdmin, panitia }
}

export interface StaffAccount extends Roles {
  uid: string
  email: string
  name: string
}

/** Every account that has a role, or is panitia of a form that hasn't ended, by name. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const [shop, forms, portal, openForms] = await Promise.all([
    roleDocs("shop").get(),
    roleDocs("forms").get(),
    roleDocs("portal").get(),
    db().collection("forms").where("status", "in", ["draft", "open", "closed"]).get(),
  ])
  const accounts = new Map<string, StaffAccount>()
  const entry = (uid: string, email = "", name = "") => {
    let account = accounts.get(uid)
    if (!account) {
      account = { uid, email, name, shop: null, formsAdmin: false, portalAdmin: false, panitia: [] }
      accounts.set(uid, account)
    }
    account.email ||= email
    account.name ||= name
    return account
  }
  for (const doc of shop.docs) {
    const role: unknown = doc.get("role")
    if (isShopRole(role)) entry(doc.id, doc.get("email"), doc.get("name")).shop = role
  }
  for (const doc of forms.docs) if (doc.get("role") === "admin") entry(doc.id, doc.get("email"), doc.get("name")).formsAdmin = true
  for (const doc of portal.docs) if (doc.get("role") === "admin") entry(doc.id, doc.get("email"), doc.get("name")).portalAdmin = true
  for (const form of openForms.docs) {
    const team = (form.get("team") as { uid: string; email: string; name: string }[] | undefined) ?? []
    for (const member of team) {
      entry(member.uid, member.email, member.name).panitia.push({
        id: form.id,
        title: (form.get("title") as string | undefined) ?? "",
        status: form.get("status") as string,
      })
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
 * Sets one app's role for `target`: a shop role, "admin" for Forms and the
 * portal, or null to take it away. Logs the change, unless nothing changed.
 * A Portal admin can't take away their own Portal admin role, and the last
 * Portal admin can't be removed, so the portal can't be locked.
 */
export async function setRole(actor: Actor, target: Target, app: RoleApp, role: string | null, now = new Date()) {
  if (app === "shop" ? role !== null && !isShopRole(role) : role !== null && role !== "admin") {
    throw new RoleError(`"${role}" isn't a role here.`)
  }
  const ref = roleDocs(app).doc(target.uid)
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const from = snap.exists ? ((snap.get("role") as string | undefined) ?? null) : null
    if (app === "portal" && from === "admin" && role === null) {
      if (actor.uid === target.uid) throw new RoleError("You can't remove your own Portal admin role. Ask another Portal admin.")
      const all = await tx.get(roleDocs("portal").where("role", "==", "admin"))
      if (all.size <= 1) throw new RoleError("This is the last Portal admin. Make someone else a Portal admin first.")
    }
    if (from === role) return
    if (role === null) tx.delete(ref)
    else tx.set(ref, { role, email: target.email, name: target.name })
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
