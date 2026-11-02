/*
 * Campaign times are entered and shown in Shenzhen time (UTC+8, no daylight
 * saving), whatever time zone the admin's laptop or the server is in.
 */

const OFFSET_MS = 8 * 60 * 60_000

/** Date → "2027-03-15T23:59", for <input type="datetime-local">. */
export function toShenzhenInput(date: Date) {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16)
}

/** "2027-03-15T23:59" in Shenzhen time → Date, or null if it isn't one. */
export function fromShenzhenInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00+08:00`)
  return Number.isNaN(date.getTime()) ? null : date
}
