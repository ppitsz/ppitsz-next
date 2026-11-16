import { connection } from "next/server"

import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin } from "@ppitsz/accounts/urls"

import { requireStaff } from "@/lib/server/auth"
import { countAwaitingVerification } from "@/lib/store"
import { StaffChrome } from "@/components/staff-chrome"

/** Signed-in staff pages. Each page also checks the session itself. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const staff = await requireStaff()
  // Every campaign's proofs: one queue for the whole dashboard.
  const awaitingCount = staff.role === "admin" ? await countAwaitingVerification() : 0
  const me = await menuAccount()

  return (
    <StaffChrome
      staff={{ name: me?.name || staff.name, email: me?.email ?? "", avatarUrl: me?.avatarUrl ?? null, role: staff.role }}
      accountHref={accountOrigin()}
      awaitingCount={awaitingCount}
    >
      {children}
    </StaffChrome>
  )
}
