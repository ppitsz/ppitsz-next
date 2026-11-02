import { redirect } from "next/navigation"

import { accountOrigin } from "@ppitsz/accounts/urls"
import { safeNext } from "@/lib/domain/account"
import { siteOrigin } from "@/lib/server/site-url"

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Signing up happens on PPITSZ Account (ADR 0008), coming back here afterwards. */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const next = `${await siteOrigin()}${safeNext(first((await searchParams).next))}`
  redirect(`${accountOrigin()}/sign-up?next=${encodeURIComponent(next)}`)
}
