/*
 * Manage Portal admins: who can manage every app's roles in PPITSZ Account.
 * Needed for the first one; after that, Portal admins add each other in the app.
 *
 *   bun scripts/admins.ts add <email> "<name>"   makes the account if needed (prints its password)
 *   bun scripts/admins.ts remove <email>
 *   bun scripts/admins.ts list
 *
 * Runs against the real project, with the FIREBASE_* variables from
 * .env.local. An account that already exists
 * (shop staff, a buyer) keeps its password. Every change is logged in
 * roleChanges, by "Script".
 */
import { generatePassword } from "@ppitsz/accounts/fields"
import { ensureAccount, findAccount } from "@ppitsz/accounts/passwords"
import { holdersOf, SCRIPT, setRole } from "@ppitsz/accounts/roles"

const [command, email, ...nameParts] = process.argv.slice(2)
const target = process.env.FIREBASE_PROJECT_ID

function usage(): never {
  console.error('Usage:\n  bun scripts/admins.ts add <email> "<name>"\n  bun scripts/admins.ts remove <email>\n  bun scripts/admins.ts list')
  process.exit(1)
}

switch (command) {
  case "add": {
    if (!email) usage()
    const password = generatePassword()
    const account = await ensureAccount(email, nameParts.join(" ") || email, password)
    await setRole(SCRIPT, account, "portal", "admin")
    console.log(`[${target}] ${account.name} <${email}> is now a Portal admin.`)
    console.log(
      account.created
        ? `New account. Password: ${password}\nSend it to them on WeChat; they can change it with Forgot password.`
        : "The account already existed, so its password is unchanged."
    )
    break
  }
  case "remove": {
    if (!email) usage()
    const account = await findAccount(email)
    if (!account) {
      console.error(`[${target}] No account with ${email}.`)
      process.exit(1)
    }
    await setRole(SCRIPT, account, "portal", null)
    console.log(`[${target}] ${email} is no longer a Portal admin.`)
    break
  }
  case "list": {
    const admins = await holdersOf("portal")
    if (admins.length === 0) console.log(`[${target}] No Portal admins yet.`)
    for (const admin of admins) console.log(`${admin.email}  ${admin.name}`)
    break
  }
  default:
    usage()
}
process.exit(0)
