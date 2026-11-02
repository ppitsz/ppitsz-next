import { redirect } from "next/navigation"

import { requireStaff } from "@/lib/server/auth"

export default async function StaffHome() {
  const staff = await requireStaff()
  redirect(staff.role === "admin" ? "/staff/verify" : "/staff/scan")
}
