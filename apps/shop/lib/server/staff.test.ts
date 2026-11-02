/*
 * Staff roles on the shared PPITSZ account, against the Auth and Firestore
 * emulators. Run with `bun run test:emulator`.
 */
import { beforeEach, describe, expect, test } from "bun:test"

import { DEMO_PROJECT } from "@ppitsz/accounts/firebase"
import { latestRoleChanges, RoleError, roleChangesOf, SCRIPT, setRole } from "@ppitsz/accounts/roles"
import { signIn, verifySession, type Session } from "@ppitsz/accounts/session"

import { listStaff, removeStaff, setStaffPassword, staffOf, upsertStaff } from "./staff"
import { adminAuth } from "../firebase/admin"

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Run these tests with `bun run test:emulator`.")
}

beforeEach(async () => {
  const cleared = await Promise.all([
    fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${DEMO_PROJECT}/accounts`, {
      method: "DELETE",
    }),
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${DEMO_PROJECT}/databases/(default)/documents`,
      { method: "DELETE" }
    ),
  ])
  if (cleared.some((res) => !res.ok)) throw new Error("Could not clear the emulators")
})

const admin = { email: "nadia@danus.test", password: "rahasia-123", name: "Nadia", role: "admin" } as const

async function sessionOf(email: string, password: string): Promise<{ cookie: string; session: Session }> {
  const result = await signIn(email, password)
  if (!result.ok) throw new Error(result.error)
  return result
}

/** The Danus staff member behind a cookie, as a Danus page sees it. */
async function staffBehind(cookie: string) {
  const session = await verifySession(cookie)
  return session ? staffOf(session) : null
}

describe("staff on a PPITSZ account", () => {
  test("staff sign in once and the shop names them with their role", async () => {
    expect(await upsertStaff(admin)).toMatchObject({ created: true })
    const { cookie } = await sessionOf(admin.email, admin.password)
    expect(await staffBehind(cookie)).toMatchObject({ email: admin.email, name: "Nadia", role: "admin" })
  })

  test("a wrong password gets one plain message", async () => {
    await upsertStaff(admin)
    expect(await signIn(admin.email, "salah")).toEqual({ ok: false, error: "Wrong email or password." })
    expect(await signIn("nobody@danus.test", "x")).toEqual({ ok: false, error: "Wrong email or password." })
  })

  test("an account without a role signs in, but isn't staff", async () => {
    await adminAuth().createUser({ email: "buyer@test.test", password: "password-1" })
    const { cookie } = await sessionOf("buyer@test.test", "password-1")
    expect(await verifySession(cookie)).toMatchObject({ email: "buyer@test.test" })
    expect(await staffBehind(cookie)).toBeNull()
  })

  test("an existing account keeps its password and gets the role", async () => {
    await adminAuth().createUser({ email: admin.email, password: "dari-forms-1" })
    expect(await upsertStaff(admin)).toMatchObject({ created: false })
    expect((await signIn(admin.email, admin.password)).ok).toBe(false)
    const { cookie } = await sessionOf(admin.email, "dari-forms-1")
    expect((await staffBehind(cookie))?.role).toBe("admin")
  })

  test("removing someone ends their Danus access at once, and leaves them signed in", async () => {
    await upsertStaff({ ...admin, role: "booth" })
    const { cookie } = await sessionOf(admin.email, admin.password)
    expect((await staffBehind(cookie))?.role).toBe("booth")
    await removeStaff(admin.email)
    expect(await staffBehind(cookie)).toBeNull()
    // Not revoked: the same session keeps working as a buyer and in Forms.
    expect(await verifySession(cookie)).toMatchObject({ email: admin.email })
  })

  test("changing a role takes effect on the next request", async () => {
    const { uid } = await upsertStaff({ ...admin, role: "booth" })
    const { cookie } = await sessionOf(admin.email, admin.password)
    await upsertStaff(admin)
    expect(await staffBehind(cookie)).toMatchObject({ uid, role: "admin" })
  })

  test("a new password signs the account out everywhere", async () => {
    await upsertStaff(admin)
    const { cookie } = await sessionOf(admin.email, admin.password)
    // Revocation works at one-second resolution.
    await Bun.sleep(1100)
    await setStaffPassword(admin.email, "baru-sekali-1")
    expect(await verifySession(cookie)).toBeNull()
    expect((await signIn(admin.email, admin.password)).ok).toBe(false)
    expect((await signIn(admin.email, "baru-sekali-1")).ok).toBe(true)
  })

  test("garbage cookies are rejected", async () => {
    expect(await verifySession("not-a-cookie")).toBeNull()
  })

  test("lists staff only", async () => {
    await upsertStaff(admin)
    await upsertStaff({ email: "budi@danus.test", password: "rahasia-456", name: "Budi", role: "booth" })
    await adminAuth().createUser({ email: "buyer@test.test", password: "password-1" })
    expect((await listStaff()).map((s) => s.email)).toEqual(["budi@danus.test", "nadia@danus.test"])
  })
})

describe("role changes", () => {
  test("every change is logged once, a password reset without the password", async () => {
    const { uid } = await upsertStaff({ ...admin, role: "booth" })
    await upsertStaff({ ...admin, role: "booth" })
    await upsertStaff(admin)
    await setStaffPassword(admin.email, "baru-sekali-1")
    const changes = await roleChangesOf(uid)
    expect(changes.map((c) => [c.kind, c.app, c.from, c.to])).toEqual([
      ["passwordReset", null, null, null],
      ["role", "shop", "booth", "admin"],
      ["role", "shop", null, "booth"],
    ])
    expect(changes.every((c) => c.by.uid === SCRIPT.uid)).toBe(true)
    expect(JSON.stringify(await latestRoleChanges())).not.toContain("baru-sekali-1")
  })

  test("a Portal admin can't remove their own role, and the last one can't be removed", async () => {
    const sari = { uid: "u-sari", email: "sari@ppitsz.test", name: "Sari" }
    const budi = { uid: "u-budi", email: "budi@ppitsz.test", name: "Budi" }
    await setRole(SCRIPT, sari, "portal", "admin")
    expect(setRole(sari, sari, "portal", null)).rejects.toBeInstanceOf(RoleError)
    expect(setRole(SCRIPT, sari, "portal", null)).rejects.toThrow("last Portal admin")
    await setRole(sari, budi, "portal", "admin")
    await setRole(budi, sari, "portal", null)
    expect((await roleChangesOf(sari.uid)).map((c) => c.to)).toEqual([null, "admin"])
  })

  test("a role that doesn't exist is refused", async () => {
    const sari = { uid: "u-sari", email: "sari@ppitsz.test", name: "Sari" }
    expect(setRole(SCRIPT, sari, "shop", "owner")).rejects.toBeInstanceOf(RoleError)
    expect(setRole(SCRIPT, sari, "forms", "booth")).rejects.toBeInstanceOf(RoleError)
  })
})
