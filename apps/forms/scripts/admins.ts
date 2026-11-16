/*
 * Manage form admins: who can create forms and manage every form's organizers.
 * Organizers themselves are added in the app, per form.
 *
 *   bun scripts/admins.ts add <email> "<name>"   makes the account if needed (prints its password)
 *   bun scripts/admins.ts remove <email>
 *   bun scripts/admins.ts list
 *
 * Runs against the real project, with the FIREBASE_* variables from
 * .env.local. An account that already exists
 * (a shop staff member) keeps its password.
 */
import { adminAuth } from "../lib/firebase/admin"
import { grantAdmin, listAdmins, revokeAdmin } from "../lib/server/staff"

const [command, email, ...nameParts] = process.argv.slice(2)
const target = process.env.FIREBASE_PROJECT_ID

/** 12 characters without look-alikes: easy to read out over WeChat. */
function generatePassword() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => alphabet[b % alphabet.length]).join("")
}

function usage(): never {
  console.error('Usage:\n  bun scripts/admins.ts add <email> "<name>"\n  bun scripts/admins.ts remove <email>\n  bun scripts/admins.ts list')
  process.exit(1)
}

switch (command) {
  case "add": {
    if (!email) usage()
    const name = nameParts.join(" ") || email
    const auth = adminAuth()
    let password: string | null = null
    const uid = await auth.getUserByEmail(email).then(
      (user) => user.uid,
      async () => {
        password = generatePassword()
        return (await auth.createUser({ email, password, displayName: name })).uid
      }
    )
    await grantAdmin(uid, email, name)
    console.log(`[${target}] ${name} <${email}> is now a form admin.`)
    console.log(password ? `New account. Password: ${password}` : "Existing account: signs in with its current password.")
    break
  }
  case "remove": {
    if (!email) usage()
    await revokeAdmin((await adminAuth().getUserByEmail(email)).uid, email)
    console.log(`[${target}] ${email} is no longer a form admin.`)
    break
  }
  case "list": {
    const admins = await listAdmins()
    if (admins.length === 0) console.log(`[${target}] No form admins.`)
    for (const a of admins) console.log(`${a.email}  (${a.name})`)
    break
  }
  default:
    usage()
}
process.exit(0)
