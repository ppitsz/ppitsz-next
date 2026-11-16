/*
 * Ids, secret tokens and short codes. Uses Web Crypto, so it runs on the
 * server, in the browser (new question ids in the builder) and in tests.
 */

/** No look-alikes (0/O, 1/I/L), so a code read aloud at the door is typed right. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
export const CODE_LENGTH = 6

function randomChars(alphabet: string, length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("")
}

/** A short id for sections, questions, options, ticket types and days. */
export function newId() {
  return randomChars("abcdefghijkmnpqrstuvwxyz23456789", 8)
}

/** The response's secret: 144 random bits, URL-safe. */
export function newToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url")
}

/** "K7P3QX": unique within its form, checked by the store. */
export function newCode() {
  return randomChars(CODE_ALPHABET, CODE_LENGTH)
}

/** A 6-digit code for getting back to a response by email. */
export function newAccessCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, "0")
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24}$/

/**
 * What the scanner read: a ticket link (the QR holds the full URL, so any
 * phone camera also opens the ticket), a bare token, or a typed code.
 */
export function parseScan(text: string): { token: string } | { code: string } | null {
  const trimmed = text.trim()
  const fromUrl = trimmed.match(/\/tickets\/([A-Za-z0-9_-]{24})(?:[/?#]|$)/)
  if (fromUrl) return { token: fromUrl[1]! }
  if (TOKEN_PATTERN.test(trimmed)) return { token: trimmed }
  const code = trimmed.toUpperCase().replace(/[\s-]/g, "")
  if (code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))) return { code }
  return null
}

export function isToken(value: string) {
  return TOKEN_PATTERN.test(value)
}
