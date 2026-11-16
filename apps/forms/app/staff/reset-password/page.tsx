import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { accountOrigin } from "@ppitsz/accounts/urls"

export const metadata: Metadata = { referrer: "no-referrer" }

/** An invite or reset link from before PPITSZ Account still works: its code goes to the account app. */
export default async function SetPasswordPage({ searchParams }: PageProps<"/staff/reset-password">) {
  const { code } = await searchParams
  redirect(
    typeof code === "string" && code
      ? `${accountOrigin()}/reset-password?code=${encodeURIComponent(code)}`
      : `${accountOrigin()}/forgot-password`
  )
}
