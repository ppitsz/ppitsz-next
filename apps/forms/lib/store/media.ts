import { COVER_TYPES, FILE_TYPES, UPLOAD_MAX_BYTES } from "../domain/files"
import { FormError } from "../domain/errors"
import { bucket } from "../firebase/admin"

/*
 * Files in Storage, always served through our own domain: covers publicly
 * at /media, file answers only to the form's organizers at /staff/files.
 * Everything lives under forms/ so it never mixes with the shop's files.
 */

export interface StoredFile {
  bytes: Uint8Array
  contentType: string
}

export const COVER_PREFIX = "forms/covers/"
export const UPLOAD_PREFIX = "forms/uploads/"

function extension(file: StoredFile, types: Record<string, string>) {
  const ext = types[file.contentType]
  if (!ext || file.bytes.byteLength === 0 || file.bytes.byteLength > UPLOAD_MAX_BYTES) throw new FormError("INVALID_FILE")
  return ext
}

const suffix = () => Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString("hex")

/** A file answer, under its form and response. Returns its path. */
export async function uploadAnswerFile(formId: string, responseId: string, questionId: string, file: StoredFile) {
  const path = `${UPLOAD_PREFIX}${formId}/${responseId}/${questionId}-${Date.now()}-${suffix()}.${extension(file, FILE_TYPES)}`
  await save(path, file)
  return path
}

/** A form's cover; a new name each time, so caches never go stale. */
export async function uploadCover(formId: string, file: StoredFile) {
  const path = `${COVER_PREFIX}${formId}-${Date.now()}.${extension(file, COVER_TYPES)}`
  await save(path, file)
  return path
}

export async function copyCover(path: string, formId: string) {
  const copy = `${COVER_PREFIX}${formId}-${Date.now()}.${path.split(".").pop() ?? "jpg"}`
  await bucket().file(path).copy(bucket().file(copy))
  return copy
}

/** The form id a file answer belongs to, from its path; null for anything else. */
export function uploadFormId(path: string) {
  if (!path.startsWith(UPLOAD_PREFIX) || path.includes("..")) return null
  return path.slice(UPLOAD_PREFIX.length).split("/")[0] || null
}

export async function readMedia(path: string) {
  const file = bucket().file(path)
  const [exists] = await file.exists()
  if (!exists) return null
  const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()])
  return { bytes, contentType: metadata.contentType ?? "application/octet-stream" }
}

/** Cleanup that may fail without failing the save. */
export async function deleteMediaQuietly(path: string | undefined) {
  if (!path) return
  try {
    await bucket().file(path).delete({ ignoreNotFound: true })
  } catch (error) {
    console.error("could not delete", path, error)
  }
}

/** Deletes every file answer of a form (the 90-day purge). */
export async function deleteFormUploads(formId: string) {
  await bucket().deleteFiles({ prefix: `${UPLOAD_PREFIX}${formId}/` })
}

async function save(path: string, file: StoredFile) {
  await bucket().file(path).save(Buffer.from(file.bytes), { contentType: file.contentType, resumable: false })
}
