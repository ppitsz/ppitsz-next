/*
 * File answers. Vercel functions accept request bodies up to 4.5 MB, so one
 * file is at most 4 MB and the form page shrinks images before sending.
 */

export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024

/** What a responder may upload, with the extension it is stored under. */
export const FILE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

/** Covers are public and must show in every browser. */
export const COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const FILE_ACCEPT = Object.keys(FILE_TYPES).join(",")
