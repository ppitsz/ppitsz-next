import { redirect } from "next/navigation"
import { cache } from "react"

import { getSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"

import type { BuyerProfile } from "../domain/types"
import { getBuyerProfile } from "../store"
import { siteOrigin } from "./site-url"
import { staffOf, type Staff, type StaffRole } from "./staff"

/*
 * One PPITSZ account and one sign-in for every app (ADR 0008): the session
 * comes from @ppitsz/accounts, signing in happens on PPITSZ Account. A Danus
 * member who buys is signed in as themselves.
 *
 * Every Danus page and server action calls requireStaff itself, and every
 * buyer action that needs an account calls requireBuyer: layouts don't
 * re-run on navigation, so a check there alone would not protect anything.
 */

/** The signed-in Danus staff member, or null (signed out, or no Danus role). Verified once per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const session = await getSession()
  return session ? staffOf(session) : null
})

/**
 * The signed-in staff member, or a redirect: to sign in when signed out, to
 * "no access" for an account without a Danus role. With `role: "admin"`,
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
  const now = new Date()
  return (
    (await getBuyerProfile(session.uid)) ?? {
      uid: session.uid,
      email: session.email,
      name: session.name === session.email ? "" : session.name,
      wechatId: "",
      phone: "",
      createdAt: now,
      updatedAt: now,
    }
  )
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
