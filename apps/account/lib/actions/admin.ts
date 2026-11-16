"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { adminAuth } from "@ppitsz/accounts/firebase"
import { generatePassword, isEmail, normalizeEmail } from "@ppitsz/accounts/fields"
import { ensureAccount, findAccount, setPassword } from "@ppitsz/accounts/passwords"
import { isShopRole } from "@ppitsz/accounts/role-labels"
import { logPasswordReset, rolesOf, setRole, type Actor, type Target } from "@ppitsz/accounts/roles"

import { requirePortalAdmin } from "../server/auth"
import { failure, str, type ActionState } from "./state"

/*
 * Accounts, for Portal admins. Each action checks the session itself, since
 * a server action is a public endpoint whatever page renders it. Every role
 * change and password reset is logged in roleChanges (@ppitsz/accounts/roles).
 */

const actorOf = (session: { uid: string; email: string; name: string }): Actor => ({
  uid: session.uid,
  email: session.email,
  name: session.name,
})

async function targetOf(uid: string): Promise<Target | null> {
  const user = await adminAuth().getUser(uid).catch(() => null)
  if (!user) return null
  return { uid: user.uid, email: user.email ?? "", name: user.displayName || user.email || "" }
}

/** Finds an account by email: its page, or the form to add them. */
export async function findAction(formData: FormData) {
  await requirePortalAdmin("/accounts")
  const email = normalizeEmail(str(formData, "email"))
  const account = isEmail(email) ? await findAccount(email) : null
  redirect(account ? `/accounts/${account.uid}` : `/accounts?missing=${encodeURIComponent(email)}`)
}

/** Reads the role controls of a form: what `target` should have in each app. */
function wantedRoles(formData: FormData) {
  const shop = str(formData, "shop")
  return {
    shop: isShopRole(shop) ? shop : null,
    forms: formData.get("formsAdmin") === "on" ? "admin" : null,
    portal: formData.get("portalAdmin") === "on" ? "admin" : null,
    site: formData.get("siteAdmin") === "on" ? "admin" : null,
  }
}

/**
 * Adds a person: makes their account if the email has none, with a new
 * password shown once, and gives them the roles ticked.
 */
export async function addPersonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requirePortalAdmin("/accounts/new")
  const email = normalizeEmail(str(formData, "email"))
  const name = str(formData, "name")
  const fieldErrors: ActionState["fieldErrors"] = {}
  if (!isEmail(email)) fieldErrors.email = "Write a valid email, like name@qq.com."
  if (name.length < 2) fieldErrors.name = "Write their name, at least 2 characters."
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  try {
    const password = generatePassword()
    const account = await ensureAccount(email, name, password)
    const target = { uid: account.uid, email, name: account.name }
    const wanted = wantedRoles(formData)
    for (const app of ["shop", "forms", "portal", "site"] as const) {
      if (wanted[app]) await setRole(actorOf(session), target, app, wanted[app])
    }
    revalidatePath("/accounts")
    return account.created
      ? { done: Date.now(), uid: account.uid, password, message: `${name} has a new account.` }
      : { done: Date.now(), uid: account.uid, message: `${target.name} already had an account, so their password stays the same.` }
  } catch (error) {
    return failure(error)
  }
}

/** Sets every app's role of one account at once, logging each change. */
export async function saveRolesAction(uid: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requirePortalAdmin(`/accounts/${uid}`)
  try {
    const target = await targetOf(uid)
    if (!target) return { error: "This account doesn't exist anymore." }
    const current = await rolesOf(uid)
    const wanted = wantedRoles(formData)
    const now = new Date()
    if (wanted.shop !== current.shop) await setRole(actorOf(session), target, "shop", wanted.shop, now)
    if (!!wanted.forms !== current.formsAdmin) await setRole(actorOf(session), target, "forms", wanted.forms, now)
    if (!!wanted.portal !== current.portalAdmin) await setRole(actorOf(session), target, "portal", wanted.portal, now)
    if (!!wanted.site !== current.siteAdmin) await setRole(actorOf(session), target, "site", wanted.site, now)
    revalidatePath(`/accounts/${uid}`)
    revalidatePath("/accounts")
    return { done: Date.now(), message: "Saved. It works on their next page." }
  } catch (error) {
    revalidatePath(`/accounts/${uid}`)
    return failure(error)
  }
}

/** Sets a new password, shown once, and signs them out everywhere. */
export async function resetPasswordForAction(uid: string): Promise<ActionState> {
  const session = await requirePortalAdmin(`/accounts/${uid}`)
  try {
    const target = await targetOf(uid)
    if (!target) return { error: "This account doesn't exist anymore." }
    const password = generatePassword()
    await setPassword(uid, password)
    await logPasswordReset(actorOf(session), target)
    revalidatePath(`/accounts/${uid}`)
    return { done: Date.now(), password }
  } catch (error) {
    return failure(error)
  }
}
