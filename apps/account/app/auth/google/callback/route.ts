import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { parseGoogleFlow, type GoogleFlow } from "@ppitsz/accounts/google"
import { completeGoogle, exchangeGoogleCode } from "@ppitsz/accounts/google-sign-in"
import { getSession, sessionCookieFor, startSession } from "@ppitsz/accounts/session"
import { afterSignIn } from "@/lib/server/auth"
import { GOOGLE_FLOW_COOKIE, flowCookieOptions, googleBackTo, googleCallbackUrl } from "@/lib/server/google"

/**
 * Where Google sends the browser back. Checks the answer belongs to the flow
 * this browser started, then signs in (or links) and goes on to `next`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const store = await cookies()
  const flow = parseGoogleFlow(store.get(GOOGLE_FLOW_COOKIE)?.value)
  // Each flow is used once.
  store.set(GOOGLE_FLOW_COOKIE, "", flowCookieOptions(0))

  if (!flow || params.get("state") !== flow.state) redirect(googleBackTo("signIn", "/", "expired"))
  // Canceled on Google's page: back where they were, without a message.
  if (params.get("error")) redirect(googleBackTo(flow.intent, flow.next))

  redirect(await finish(flow, params.get("code")))
}

/** Signs in or links, and returns where to go. Never throws: redirect() must stay outside a try. */
async function finish(flow: GoogleFlow, code: string | null): Promise<string> {
  if (!code) return googleBackTo(flow.intent, flow.next, "failed")
  try {
    const identity = await exchangeGoogleCode(code, flow, googleCallbackUrl())
    if (!identity.ok) return googleBackTo(flow.intent, flow.next, identity.code)

    const session = flow.intent === "link" ? await getSession() : null
    if (flow.intent === "link" && !session) return "/sign-in"

    const result = await completeGoogle(identity.value, session?.uid ?? null)
    if (!result.ok) return googleBackTo(flow.intent, flow.next, result.code)
    if (flow.intent === "link") return googleBackTo("link", "/", "linked")

    await startSession(await sessionCookieFor(result.value))
    return afterSignIn(result.value, flow.next)
  } catch (error) {
    console.error("google sign-in", error)
    return googleBackTo(flow.intent, flow.next, "failed")
  }
}
