import { redirect } from "next/navigation"

import { signInUrl } from "@ppitsz/accounts/urls"
import { siteOrigin } from "@/lib/server/site-url"

/** Staff sign in on PPITSZ Account (ADR 0008), with the same account as everywhere. */
export default async function SignInPage() {
  redirect(signInUrl(`${await siteOrigin()}/staff`))
}
