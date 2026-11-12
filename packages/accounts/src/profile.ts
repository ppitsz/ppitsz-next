import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore"

import { adminAuth, db } from "./firebase"
import type { ProfileFields } from "./fields"

/*
 * The account's profile, shared by every app: accounts/{uid}. The shop reads
 * it at checkout, Forms prefills from it, and the account app edits it.
 * The email is the account's sign-in, copied here for lists.
 *
 * Two avatar slots (ADR 0009). `avatarPath` is the photo the person chose;
 * `providerAvatarPath` is a copy of a linked sign-in's photo (Google's),
 * stored by us because Google's own image URLs don't load in
 * China. The person's own photo always wins; see shownAvatarPath.
 */

export interface Profile {
  uid: string
  email: string
  name: string
  /** "" until filled in. */
  wechatId: string
  /** "" until filled in. */
  phone: string
  /** Storage path of the photo the person chose; "" when none. */
  avatarPath: string
  /** Storage path of our copy of a linked sign-in's photo; "" when none. */
  providerAvatarPath: string
  createdAt: Date
  updatedAt: Date
}

export const PROFILES = "accounts"

const profiles = () => db().collection(PROFILES)

const toDate = (value: unknown, fallback: Date) => (value instanceof Timestamp ? value.toDate() : fallback)

export function profileFromDoc(snap: DocumentSnapshot): Profile {
  const d = snap.data()!
  const createdAt = toDate(d.createdAt, new Date(0))
  return {
    uid: snap.id,
    email: d.email ?? "",
    name: d.name ?? "",
    wechatId: d.wechatId ?? "",
    phone: d.phone ?? "",
    avatarPath: d.avatarPath ?? "",
    providerAvatarPath: d.providerAvatarPath ?? "",
    createdAt,
    updatedAt: toDate(d.updatedAt, createdAt),
  }
}

/** The avatar to show: the person's own photo, else a linked sign-in's, else none (initials). */
export function shownAvatarPath(profile: Pick<Profile, "avatarPath" | "providerAvatarPath">): string | null {
  return profile.avatarPath || profile.providerAvatarPath || null
}

function profileToDoc({ uid: _uid, ...p }: Profile) {
  return { ...p, createdAt: Timestamp.fromDate(p.createdAt), updatedAt: Timestamp.fromDate(p.updatedAt) }
}

/** The account's profile, or null when it has none yet. */
export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await profiles().doc(uid).get()
  return snap.exists ? profileFromDoc(snap) : null
}

/** Stores the profile's fields (already checked), keeping when it was made, and the account's display name with it. */
export async function saveProfile(
  account: { uid: string; email: string },
  fields: ProfileFields,
  now = new Date()
): Promise<Profile> {
  const ref = profiles().doc(account.uid)
  const { profile, renamed } = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? profileFromDoc(snap) : null
    const profile: Profile = {
      uid: account.uid,
      email: account.email,
      name: fields.name,
      wechatId: fields.wechatId,
      phone: fields.phone,
      // Saving the details never touches the photos.
      avatarPath: current?.avatarPath ?? "",
      providerAvatarPath: current?.providerAvatarPath ?? "",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    tx.set(ref, profileToDoc(profile))
    return { profile, renamed: !snap.exists || snap.get("name") !== fields.name }
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

/** Makes an empty profile for an account that has none (a staff account made by a script), keeping the email current. */
export async function ensureProfile(account: { uid: string; email: string }, name: string, now = new Date()) {
  const ref = profiles().doc(account.uid)
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      tx.set(
        ref,
        profileToDoc({ ...account, name, wechatId: "", phone: "", avatarPath: "", providerAvatarPath: "", createdAt: now, updatedAt: now })
      )
    } else if (snap.get("email") !== account.email) {
      tx.update(ref, { email: account.email })
    }
  })
}

/** The profile of a signed-in account, or an empty one, never stored, when it has none. */
export async function profileOrBlank(session: { uid: string; email: string; name: string }): Promise<Profile> {
  return (
    (await getProfile(session.uid)) ?? {
      uid: session.uid,
      email: session.email,
      name: session.name,
      wechatId: "",
      phone: "",
      avatarPath: "",
      providerAvatarPath: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  )
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
  const ref = profiles().doc(uid)
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error("NO_PROFILE")
    const previous = (snap.get(slot) as string | undefined) ?? ""
    tx.update(ref, { [slot]: path, updatedAt: Timestamp.fromDate(now) })
    return previous
  })
}

/**
 * Copies every old shop profile (buyers/{uid}) to accounts/{uid}, once. Safe
 * to run again: a profile already in accounts/ that is as new or newer is
 * left alone. Returns how many were copied and skipped.
 */
export async function migrateBuyerProfiles() {
  const old = await db().collection("buyers").get()
  let copied = 0
  let skipped = 0
  for (const doc of old.docs) {
    const ref = profiles().doc(doc.id)
    const wrote = await db().runTransaction(async (tx) => {
      const current = await tx.get(ref)
      const oldUpdated = toDate(doc.get("updatedAt") ?? doc.get("createdAt"), new Date(0))
      if (current.exists && profileFromDoc(current).updatedAt >= oldUpdated) return false
      const createdAt = toDate(doc.get("createdAt"), new Date())
      tx.set(
        ref,
        profileToDoc({
          uid: doc.id,
          email: doc.get("email") ?? "",
          name: doc.get("name") ?? "",
          wechatId: doc.get("wechatId") ?? "",
          phone: doc.get("phone") ?? "",
          avatarPath: "",
          providerAvatarPath: "",
          createdAt,
          updatedAt: toDate(doc.get("updatedAt"), createdAt),
        })
      )
      return true
    })
    if (wrote) copied++
    else skipped++
  }
  return { copied, skipped }
}
