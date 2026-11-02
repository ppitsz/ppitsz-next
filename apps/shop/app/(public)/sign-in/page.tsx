import { redirect } from "next/navigation"

import { accountOrigin } from "@ppitsz/accounts/urls"
import { safeNext } from "@/lib/domain/account"
import { siteOrigin } from "@/lib/server/site-url"

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Signing in happens on PPITSZ Account (ADR 0008), coming back here afterwards. */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = `${await siteOrigin()}${safeNext(first((await searchParams).next))}`
  redirect(`${accountOrigin()}/sign-in?next=${encodeURIComponent(next)}`)
}
