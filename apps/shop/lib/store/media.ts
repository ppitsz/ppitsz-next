import { ShopError } from "../domain/errors"
import { bucket } from "../firebase/admin"

/*
 * Files in Storage: product photos, payment QRs and transfer proofs. They are
 * always served through our own domain (/media, /staff/proofs), never by
 * Google directly.
 */

// Vercel functions accept request bodies up to 4.5 MB; browsers shrink
// screenshots before upload, so real proofs are far smaller.
export const PROOF_MAX_BYTES = 4 * 1024 * 1024

const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}
/** Public images (product photos, payment QRs) must show in every browser: no HEIC. */
const PUBLIC_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export interface ImageFile {
  bytes: Uint8Array
  contentType: string
}

/** An image on save: a new file, null to remove it, undefined to keep it. */
export type ImageChange = ImageFile | null | undefined

/** Throws INVALID_FILE unless `file` can be stored as a proof. */
export function assertProofFile(file: ImageFile) {
  extensionOf(file, PROOF_TYPES)
}

/** Stores a buyer's transfer screenshot under the order. Returns its path. */
export async function uploadProof(orderId: string, file: ImageFile, now: Date) {
  const ext = extensionOf(file, PROOF_TYPES)
  // Unique even for two uploads in the same millisecond: the loser's cleanup must not delete the winner's file.
  const suffix = Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString("hex")
  const path = `proofs/${orderId}/${now.getTime()}-${suffix}.${ext}`
  await save(path, file)
  return path
}

/** Stores a public image as `${prefix}-${time}.${ext}`; a new name each time, so caches never go stale. */
export async function uploadImage(prefix: string, file: ImageFile) {
  const ext = extensionOf(file, PUBLIC_IMAGE_TYPES)
  const path = `${prefix}-${Date.now()}.${ext}`
  await save(path, file)
  return path
}

/**
 * Stores the new files of a save, one per `[prefix, change]`, before its
 * transaction runs. Returns their paths (undefined where nothing is new). If
 * one upload fails, the others are deleted again.
 */
export async function uploadChanges(changes: [prefix: string, change: ImageChange][]) {
  const paths: (string | undefined)[] = []
  try {
    for (const [prefix, change] of changes) paths.push(change ? await uploadImage(prefix, change) : undefined)
  } catch (error) {
    await deleteUnused(paths, [])
    throw error
  }
  return paths
}

/**
 * Copies a stored image to `${prefix}-${time}.${ext}`, so two records never
 * share a file that one of them might delete. Returns the new path.
 */
export async function copyImage(path: string, prefix: string) {
  const ext = path.split(".").pop() ?? "png"
  const copy = `${prefix}-${Date.now()}.${ext}`
  await bucket().file(path).copy(bucket().file(copy))
  return copy
}

/** The path a save stores: the new upload, nothing when removed, otherwise the stored one. */
export function chosenPath(change: ImageChange, uploaded: string | undefined, stored: string | undefined) {
  return uploaded ?? (change === null ? undefined : stored)
}

/** Deletes the images in `paths` that `kept` doesn't use any more. */
export async function deleteUnused(paths: (string | undefined)[], kept: (string | undefined)[]) {
  const keep = new Set(kept)
  await Promise.all(paths.flatMap((p) => (p && !keep.has(p) ? [deleteMediaQuietly(p)] : [])))
}

export async function readMedia(path: string) {
  const file = bucket().file(path)
  const [exists] = await file.exists()
  if (!exists) return null
  const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()])
  return { bytes, contentType: metadata.contentType ?? "application/octet-stream" }
}

/** Cleanup that may fail without failing the save: an orphaned image costs nothing much. */
export async function deleteMediaQuietly(path: string) {
  try {
    await bucket().file(path).delete({ ignoreNotFound: true })
  } catch (error) {
    console.error("could not delete", path, error)
  }
}

function extensionOf(file: ImageFile, types: Record<string, string>) {
  const ext = types[file.contentType]
  if (!ext || file.bytes.byteLength === 0 || file.bytes.byteLength > PROOF_MAX_BYTES) {
    throw new ShopError("INVALID_FILE")
  }
  return ext
}

async function save(path: string, file: ImageFile) {
  await bucket()
    .file(path)
    .save(Buffer.from(file.bytes), { contentType: file.contentType, resumable: false })
}
