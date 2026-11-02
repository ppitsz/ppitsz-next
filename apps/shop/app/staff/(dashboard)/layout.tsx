import { connection } from "next/server"

import { requireStaff } from "@/lib/server/auth"
import { countAwaitingVerification } from "@/lib/store"
import { StaffChrome } from "@/components/staff-chrome"

/** Signed-in Danus pages. Each page also checks the session itself. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const staff = await requireStaff()
  // Every campaign's proofs: one queue for the whole dashboard.
  const awaitingCount = staff.role === "admin" ? await countAwaitingVerification() : 0

  return (
    <StaffChrome staff={{ name: staff.name, role: staff.role }} awaitingCount={awaitingCount}>
      {children}
    </StaffChrome>
  )
}
