import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { googleAuthUrl, googleConfig, newGoogleFlow } from "@ppitsz/accounts/google"
import { getSession } from "@ppitsz/accounts/session"
import { safeNext } from "@ppitsz/accounts/urls"
import { GOOGLE_FLOW_COOKIE, flowCookieOptions, googleBackTo, googleCallbackUrl } from "@/lib/server/google"
import { allowRequest, LIMITS } from "@/lib/server/rate-limit"
import { clientIp } from "@/lib/server/request-meta"

/**
 * "Continue with Google" (?next=…) and the profile page's "Link Google"
 * (?intent=link): remembers the flow in a cookie, then sends the browser to
 * Google to pick an account.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const intent = params.get("intent") === "link" ? "link" : "signIn"
  const next = intent === "link" ? "/" : safeNext(params.get("next"))

  const config = googleConfig()
  if (!config) redirect(googleBackTo(intent, next, "off"))
  if (intent === "link" && !(await getSession())) redirect("/sign-in")
  if (!(await allowRequest([{ key: `google:ip:${await clientIp()}`, limit: LIMITS.googlePerIp }]))) {
    redirect(googleBackTo(intent, next, "busy"))
  }

  const flow = newGoogleFlow(intent, next)
  // Ten minutes to pick an account on Google's page.
  ;(await cookies()).set(GOOGLE_FLOW_COOKIE, JSON.stringify(flow), flowCookieOptions(10 * 60))
  redirect(googleAuthUrl(config.clientId, googleCallbackUrl(), flow))
}
