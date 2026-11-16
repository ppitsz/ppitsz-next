import { redirect } from "next/navigation"
import { cache } from "react"

import { blankProfile } from "@ppitsz/accounts/profile"
import { getSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"

import type { BuyerProfile } from "../domain/types"
import { getBuyerProfile } from "../store"
import { siteOrigin } from "./site-url"
import { staffOf, type Staff, type StaffRole } from "./staff"

/*
 * One PPITSZ account and one sign-in for every app (ADR 0008): the session
 * comes from @ppitsz/accounts, signing in happens on PPITSZ Account. A shop staff
 * member who buys is signed in as themselves.
 *
 * Every staff page and server action calls requireStaff itself, and every
 * buyer action that needs an account calls requireBuyer: layouts don't
 * re-run on navigation, so a check there alone would not protect anything.
 */

/** The signed-in shop staff member, or null (signed out, or no shop role). Verified once per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const session = await getSession()
  return session ? staffOf(session) : null
})

/**
 * The signed-in staff member, or a redirect: to sign in when signed out, to
 * "no access" for an account without a shop role. With `role: "admin"`,
 * booth staff are sent to the scanner instead.
 */
export async function requireStaff(role?: StaffRole): Promise<Staff> {
  const session = await getSession()
  if (!session) redirect(signInUrl(`${await siteOrigin()}/staff`))
  const staff = await getStaff()
  if (!staff) redirect("/staff/no-access")
  if (role === "admin" && staff.role !== "admin") redirect("/staff/scan")
  return staff
}

/**
 * The signed-in buyer's profile, or null. Verified once per request. An
 * account whose profile is missing gets an empty one, filled in at checkout.
 */
export const getBuyer = cache(async (): Promise<BuyerProfile | null> => {
  const session = await getSession()
  if (!session) return null
  return (await getBuyerProfile(session.uid)) ?? blankProfile(session)
})

/** The signed-in buyer, or a redirect to sign in on PPITSZ Account that comes back to `next` (a path here). */
export async function requireBuyer(next: string): Promise<BuyerProfile> {
  const buyer = await getBuyer()
  if (!buyer) redirect(signInUrl(`${await siteOrigin()}${next}`))
  return buyer
}

/** Sign-in on PPITSZ Account, coming back to `next` (a path here). For links and redirects. */
export async function buyerSignInUrl(next: string) {
  return signInUrl(`${await siteOrigin()}${next}`)
}
