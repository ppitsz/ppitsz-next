import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore"

import { adminAuth, db } from "./firebase"
import type { ProfileFields } from "./fields"

/*
 * The account's profile, shared by every app: accounts/{uid}. The shop reads
 * it at checkout, Forms prefills from it, and the account app edits it.
 * The email is the account's sign-in, copied here for lists.
 */

export interface Profile {
  uid: string
  email: string
  name: string
  /** "" until filled in. */
  wechatId: string
  /** "" until filled in. */
  phone: string
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
    createdAt,
    updatedAt: toDate(d.updatedAt, createdAt),
  }
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
    const profile: Profile = {
      uid: account.uid,
      email: account.email,
      name: fields.name,
      wechatId: fields.wechatId,
      phone: fields.phone,
      createdAt: snap.exists ? profileFromDoc(snap).createdAt : now,
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
      tx.set(ref, profileToDoc({ ...account, name, wechatId: "", phone: "", createdAt: now, updatedAt: now }))
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  )
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
