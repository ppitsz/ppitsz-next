import { redirect } from "next/navigation"

import { accountOrigin } from "@ppitsz/accounts/urls"

/** Passwords are reset on PPITSZ Account (ADR 0008). */
export default function ForgotPasswordPage() {
  redirect(`${accountOrigin()}/forgot-password`)
}
