import type { Instrumentation } from "next"

/*
 * Errors Next.js catches while rendering a page, running a route handler or
 * a server action go to the alert webhook (lib/server/alerts.ts). Errors a
 * server action catches itself go there through messageOf.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { alertText, sendAlert } = await import("./lib/server/alerts")
  // The route pattern, not the path: /tickets/[token] must not put a secret link in the chat.
  const text = alertText(error, `${context.routeType} ${request.method} ${context.routePath}`)
  if (text) await sendAlert(text)
}
