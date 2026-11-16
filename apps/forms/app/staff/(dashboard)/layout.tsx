import { connection } from "next/server"

import { menuAccount } from "@ppitsz/accounts/avatar"
import { accountOrigin } from "@ppitsz/accounts/urls"

import { hasDueMail, sendSoon } from "@/lib/mail/queue"
import { requireStaff } from "@/lib/server/auth"
import { StaffChrome } from "@/components/staff-chrome"

/** Signed-in staff pages. Each page also checks the session and the form itself. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const staff = await requireStaff()
  // Organizers at work keep the email queue moving between the daily crons.
  if (await hasDueMail().catch(() => false)) sendSoon()
  const me = await menuAccount()
  return (
    <StaffChrome
      staff={{ name: me?.name || staff.name, email: me?.email ?? "", avatarUrl: me?.avatarUrl ?? null, isAdmin: staff.isAdmin }}
      accountHref={accountOrigin()}
    >
      {children}
    </StaffChrome>
  )
}
