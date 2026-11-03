import { cache } from "react"

import { bucket } from "./firebase"
import { ensureProfile, getProfile, setAvatarPath, shownAvatarPath } from "./profile"
import { getSession, type Session } from "./session"

/*
 * Avatars (ADR 0009). Stored in Storage under avatars/{uid}/, a new file name
 * on every change, so a URL never changes what it shows and browsers may
 * cache it forever. Served by every app from its own domain at /avatars/…
 * (each app's app/avatars/[...path]/route.ts calls avatarResponse), never by
 * Google directly, so they load in China without a VPN.
 */

export const AVATAR_PREFIX = "avatars/"

/** After the browser shrinks it (512px JPEG) a photo is far smaller; this keeps a raw upload out. */
export const AVATAR_MAX_BYTES = 1024 * 1024

/** Shown in every browser: no HEIC. */
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export class AvatarError extends Error {}

/** Where an app serves a stored avatar: its own /avatars route. */
export function avatarUrl(path: string | null): string | null {
  return path?.startsWith(AVATAR_PREFIX) ? `/${path}` : null
}

/** Stores a new photo as the person's own avatar and deletes the one it replaces. Returns its URL. */
export async function saveAvatar(session: Session, file: { bytes: Uint8Array; contentType: string }) {
  const ext = AVATAR_TYPES[file.contentType]
  if (!ext) throw new AvatarError("Choose a JPEG, PNG or WebP photo.")
  if (file.bytes.byteLength === 0) throw new AvatarError("That file is empty.")
  if (file.bytes.byteLength > AVATAR_MAX_BYTES) throw new AvatarError("That photo is too large. Choose one under 1 MB.")

  // A staff account made by a script may have no profile yet.
  await ensureProfile(session, session.name === session.email ? "" : session.name)
  const suffix = Buffer.from(crypto.getRandomValues(new Uint8Array(6))).toString("hex")
  const path = `${AVATAR_PREFIX}${session.uid}/${Date.now()}-${suffix}.${ext}`
  await bucket()
    .file(path)
    .save(Buffer.from(file.bytes), {
      contentType: file.contentType,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    })
  const previous = await setAvatarPath(session.uid, path).catch(async (error) => {
    await deleteAvatarFile(path)
    throw error
  })
  await deleteAvatarFile(previous)
  return avatarUrl(path)
}

/** Removes the person's own avatar; a linked sign-in's photo, or the initials, show again. */
export async function removeAvatar(session: Session) {
  const profile = await getProfile(session.uid)
  if (!profile?.avatarPath) return
  const previous = await setAvatarPath(session.uid, "")
  await deleteAvatarFile(previous)
}

async function deleteAvatarFile(path: string) {
  if (!path.startsWith(AVATAR_PREFIX)) return
  await bucket()
    .file(path)
    .delete()
    .catch(() => undefined)
}

/** The response for GET /avatars/{uid}/{file}: the stored photo, cached for good. */
export async function avatarResponse(segments: string[]): Promise<Response> {
  const path = AVATAR_PREFIX + segments.map(decodeURIComponent).join("/")
  if (path.includes("..") || segments.length !== 2) return new Response("Not found", { status: 404 })
  const file = bucket().file(path)
  const [exists] = await file.exists()
  if (!exists) return new Response("Not found", { status: 404 })
  const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()])
  const contentType = String(metadata.contentType ?? "")
  if (!AVATAR_TYPES[contentType]) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

/** Who is signed in, as the header's profile menu shows them. */
export interface MenuAccount {
  name: string
  email: string
  /** This app's URL for their avatar, or null for initials. */
  avatarUrl: string | null
}

/** The signed-in person for the profile menu, or null. One session check and one profile read per request. */
export const menuAccount = cache(async (): Promise<MenuAccount | null> => {
  const session = await getSession()
  if (!session) return null
  const profile = await getProfile(session.uid)
  return {
    name: profile?.name || (session.name === session.email ? "" : session.name),
    email: session.email,
    avatarUrl: profile ? avatarUrl(shownAvatarPath(profile)) : null,
  }
})
