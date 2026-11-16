import { isToken } from "@/lib/domain/codes"
import { ticketCalendar } from "@/lib/server/notify"
import { siteOrigin } from "@/lib/server/site-url"
import { getForm, getResponseByToken } from "@/lib/store"

/** "Add to calendar": the ticket's days as an .ics file. */
export async function GET(_request: Request, ctx: RouteContext<"/tickets/[token]/calendar">) {
  const { token } = await ctx.params
  const response = isToken(token) ? await getResponseByToken(token) : null
  const form = response && (await getForm(response.formId))
  if (!response || !form?.tickets.enabled) return new Response("Not found", { status: 404 })
  return new Response(ticketCalendar(form, response, await siteOrigin()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ticket.ics"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  })
}
