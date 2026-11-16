/*
 * Manage shop staff accounts.
 *
 *   bun scripts/staff.ts add <email> <admin|booth> "<name>"   new accounts get a printed password
 *   bun scripts/staff.ts password <email>                     prints a new password, signs out everywhere
 *   bun scripts/staff.ts remove <email>                       takes the role away at once
 *   bun scripts/staff.ts list
 *
 * Runs against the real project, with the FIREBASE_* variables from
 * .env.local. An account that already exists
 * (a Forms organizer, a buyer) keeps its password on `add`.
 */
import { listStaff, removeStaff, setStaffPassword, STAFF_ROLES, upsertStaff, type StaffRole } from "../lib/server/staff"

const [command, email, role, ...nameParts] = process.argv.slice(2)
const target = process.env.FIREBASE_PROJECT_ID

/** 12 characters without look-alikes: easy to read out over WeChat. */
function generatePassword() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("")
}

function usage(): never {
  console.error(
    'Usage:\n  bun scripts/staff.ts add <email> <admin|booth> "<name>"\n  bun scripts/staff.ts password <email>\n  bun scripts/staff.ts remove <email>\n  bun scripts/staff.ts list'
  )
  process.exit(1)
}

switch (command) {
  case "add": {
    if (!email || !role || !(STAFF_ROLES as readonly string[]).includes(role)) usage()
    const password = generatePassword()
    const name = nameParts.join(" ") || email
    const { created } = await upsertStaff({ email, password, name, role: role as StaffRole })
    console.log(`[${target}] ${name} <${email}> is now ${role}.`)
    console.log(
      created
        ? `New account. Password: ${password}\nSend it privately.`
        : "Existing account: signs in with its current password."
    )
    break
  }
  case "password": {
    if (!email) usage()
    const password = generatePassword()
    await setStaffPassword(email, password)
    console.log(`[${target}] New password for ${email}: ${password}`)
    console.log("Send it privately. Every session of this account (Forms too) has been signed out.")
    break
  }
  case "remove": {
    if (!email) usage()
    await removeStaff(email)
    console.log(`[${target}] ${email} is no longer shop staff. The account itself stays.`)
    break
  }
  case "list": {
    const staff = await listStaff()
    if (staff.length === 0) console.log(`[${target}] No staff accounts.`)
    for (const s of staff) console.log(`${s.role.padEnd(6)} ${s.email}  (${s.name})`)
    break
  }
  default:
    usage()
}
process.exit(0)
