import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore"

import { adminAuth, db } from "./firebase"
import type { MemberFields, ProfileFields } from "./fields"

/*
 * One record per person, shared by every app and the old website:
 * users/{uid} (ADR 0014). The shop reads it at checkout, Forms prefills from
 * it, the account app edits it, and the old website reads and writes it from
 * the browser.
 *
 *   users/{uid}                   email, name, birthday, cohortYear (shared
 *                                 with the old website), our two avatar slots,
 *                                 updatedAt, roles (./roles.ts), and the old
 *                                 website's own fields, kept as they are:
 *                                 admin, status, graduated, createdAt,
 *                                 lastLogin, submittedForms, attendedForms
 *   users/{uid}/private/contact   wechatId, phone
 *
 * WeChat ID and phone sit apart because the old website's rules let browsers
 * read users/{uid}; no rule matches the sub-document, so it stays closed.
 *
 * Two avatar slots (ADR 0009). `avatarPath` is the photo the person chose;
 * `providerAvatarPath` is a copy of a linked sign-in's photo (Google's),
 * stored by us because Google's own image URLs don't load in
 * China. The person's own photo always wins; see shownAvatarPath.
 */

export interface Profile extends ProfileFields, MemberFields {
  uid: string
  email: string
  /** Storage path of the photo the person chose; "" when none. */
  avatarPath: string
  /** Storage path of our copy of a linked sign-in's photo; "" when none. */
  providerAvatarPath: string
  createdAt: Date
  updatedAt: Date
}

export const PROFILES = "users"

export const people = () => db().collection(PROFILES)
const contactOf = (uid: string) => people().doc(uid).collection("private").doc("contact")

const toDate = (value: unknown, fallback: Date) => (value instanceof Timestamp ? value.toDate() : fallback)
const text = (value: unknown) => (typeof value === "string" ? value : "")

export function profileFromDoc(snap: DocumentSnapshot, contact?: DocumentSnapshot): Profile {
  const d = snap.data()!
  const createdAt = toDate(d.createdAt, new Date(0))
  return {
    uid: snap.id,
    email: text(d.email),
    name: text(d.name),
    wechatId: text(contact?.get("wechatId")),
    phone: text(contact?.get("phone")),
    birthday: text(d.birthday),
    cohortYear: typeof d.cohortYear === "number" ? d.cohortYear : null,
    avatarPath: text(d.avatarPath),
    providerAvatarPath: text(d.providerAvatarPath),
    createdAt,
    updatedAt: toDate(d.updatedAt, createdAt),
  }
}

/** The avatar to show: the person's own photo, else a linked sign-in's, else none (initials). */
export function shownAvatarPath(profile: Pick<Profile, "avatarPath" | "providerAvatarPath">): string | null {
  return profile.avatarPath || profile.providerAvatarPath || null
}

/**
 * A new users/{uid} in the shape the old website makes at its own sign-up, so
 * its pages and email jobs read ours the same: not an admin, active, and with
 * no forms yet. A missing birthday or intake year is null, as it writes them.
 */
export function newPersonDoc(
  account: { email: string; name: string },
  member: Partial<MemberFields>,
  now: Date
): Record<string, unknown> {
  const at = Timestamp.fromDate(now)
  return {
    email: account.email,
    name: account.name,
    birthday: member.birthday || null,
    cohortYear: member.cohortYear ?? null,
    admin: false,
    status: "active",
    graduated: false,
    submittedForms: [],
    attendedForms: [],
    avatarPath: "",
    providerAvatarPath: "",
    createdAt: at,
    lastLogin: at,
    updatedAt: at,
  }
}

/** The person's profile, or null when they have no record yet. */
export async function getProfile(uid: string): Promise<Profile | null> {
  const [snap, contact] = await db().getAll(people().doc(uid), contactOf(uid))
  return snap!.exists ? profileFromDoc(snap!, contact) : null
}

/**
 * Stores the fields given (already checked), and only those: the shop saves
 * name and contact at checkout, the account app everything. Makes the record
 * when there is none, and keeps the account's display name with the name.
 */
export async function saveProfile(
  account: { uid: string; email: string },
  fields: Partial<ProfileFields & MemberFields>,
  now = new Date()
): Promise<Profile> {
  const ref = people().doc(account.uid)
  const contactRef = contactOf(account.uid)
  const at = Timestamp.fromDate(now)
  const { profile, renamed } = await db().runTransaction(async (tx) => {
    const [snap, contact] = await tx.getAll(ref, contactRef)
    const shared: Record<string, unknown> = { email: account.email, updatedAt: at }
    if (fields.name !== undefined) shared.name = fields.name
    if (fields.birthday !== undefined) shared.birthday = fields.birthday || null
    if (fields.cohortYear !== undefined) shared.cohortYear = fields.cohortYear
    if (snap!.exists) tx.update(ref, shared)
    else tx.set(ref, { ...newPersonDoc({ email: account.email, name: fields.name ?? "" }, fields, now), ...shared })

    const private_: Record<string, unknown> = {}
    if (fields.wechatId !== undefined) private_.wechatId = fields.wechatId
    if (fields.phone !== undefined) private_.phone = fields.phone
    if (Object.keys(private_).length > 0) tx.set(contactRef, { ...private_, updatedAt: at }, { merge: true })

    const current = snap!.exists ? profileFromDoc(snap!, contact) : null
    const profile: Profile = {
      uid: account.uid,
      email: account.email,
      name: fields.name ?? current?.name ?? "",
      wechatId: fields.wechatId ?? current?.wechatId ?? "",
      phone: fields.phone ?? current?.phone ?? "",
      birthday: fields.birthday ?? current?.birthday ?? "",
      cohortYear: fields.cohortYear !== undefined ? fields.cohortYear : (current?.cohortYear ?? null),
      // Saving the details never touches the photos.
      avatarPath: current?.avatarPath ?? "",
      providerAvatarPath: current?.providerAvatarPath ?? "",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    return { profile, renamed: fields.name !== undefined && (!snap!.exists || snap!.get("name") !== fields.name) }
  })
  // The account's display name is what staff lists and the session show.
  if (renamed && fields.name) {
    await adminAuth()
      .updateUser(account.uid, { displayName: fields.name })
      .catch((error: { code?: string }) => {
        if (error.code !== "auth/user-not-found") throw error
      })
  }
  return profile
}

/** Makes the record for an account that has none (a staff account made by a script, a new Google sign-in), keeping the email current. */
export async function ensureProfile(account: { uid: string; email: string }, name: string, now = new Date()) {
  const ref = people().doc(account.uid)
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) tx.set(ref, newPersonDoc({ email: account.email, name }, {}, now))
    else if (snap.get("email") !== account.email) tx.update(ref, { email: account.email })
  })
}

/**
 * Notes a sign-in, as the old website does on its own: it marks people
 * inactive after years without one, and signing in makes them active again.
 */
export async function noteSignIn(uid: string, now = new Date()) {
  await people().doc(uid).update({ lastLogin: Timestamp.fromDate(now), status: "active" })
}

/** The profile of a signed-in account, or an empty one, never stored, when it has none. */
export async function profileOrBlank(session: { uid: string; email: string; name: string }): Promise<Profile> {
  return (await getProfile(session.uid)) ?? blankProfile(session)
}

/** An empty profile for an account with no record yet. */
export function blankProfile(session: { uid: string; email: string; name: string }, now = new Date()): Profile {
  return {
    uid: session.uid,
    email: session.email,
    name: session.name === session.email ? "" : session.name,
    wechatId: "",
    phone: "",
    birthday: "",
    cohortYear: null,
    avatarPath: "",
    providerAvatarPath: "",
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Sets one of the two photos (a stored path, or "" to remove it) and
 * returns the path it replaced, for the caller to delete: `avatarPath` is
 * the person's own, `providerAvatarPath` the linked Google account's copy.
 */
export async function setAvatarSlot(
  uid: string,
  slot: "avatarPath" | "providerAvatarPath",
  path: string,
  now = new Date()
): Promise<string> {
  const ref = people().doc(uid)
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error("NO_PROFILE")
    const previous = (snap.get(slot) as string | undefined) ?? ""
    tx.update(ref, { [slot]: path, updatedAt: Timestamp.fromDate(now) })
    return previous
  })
}
