import { redirect } from "next/navigation"

import { accountOrigin } from "@ppitsz/accounts/urls"

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * A reset link from before PPITSZ Account (Firebase's email, `?oobCode=`)
 * still works: its code goes to the account app's own page.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const code = first((await searchParams).oobCode)
  redirect(code ? `${accountOrigin()}/reset-password?code=${encodeURIComponent(code)}` : `${accountOrigin()}/forgot-password`)
}
