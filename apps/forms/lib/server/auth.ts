import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"

import { teamMayAccess } from "../domain/form"
import type { Form } from "../domain/types"
import { getForm } from "../store"
import { siteOrigin } from "./site-url"
import { staffOf, type Staff } from "./staff"

/*
 * Staff sessions: one PPITSZ account and one sign-in for every app (ADR
 * 0008). Every staff page and server action calls requireStaff or
 * requireFormAccess itself: layouts don't re-run on navigation, so a check
 * there alone would not protect anything.
 */

/** The signed-in form admin or organizer, or null (signed out, or neither). Verified once per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const session = await getSession()
  return session ? staffOf(session) : null
})

/**
 * The signed-in staff member, or a redirect: to sign in when signed out, to
 * "no access" for an account that is neither a form admin nor an organizer.
 */
export async function requireStaff(): Promise<Staff> {
  if (!(await getSession())) redirect(signInUrl(`${await siteOrigin()}/staff`))
  const staff = await getStaff()
  if (!staff) redirect("/staff/no-access")
  return staff
}

export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff()
  if (!staff.isAdmin) redirect("/staff")
  return staff
}

/** May `staff` work on `form`? Admins always; organizers until the form has ended. */
export function mayAccess(staff: Staff, form: Form) {
  return staff.isAdmin || (form.teamUids.includes(staff.uid) && teamMayAccess(form))
}

/** The form, for a signed-in admin or one of its organizers; otherwise not found. */
export async function requireFormAccess(formId: string): Promise<{ staff: Staff; form: Form }> {
  const staff = await requireStaff()
  const form = await getForm(formId)
  if (!form || !mayAccess(staff, form)) notFound()
  return { staff, form }
}
