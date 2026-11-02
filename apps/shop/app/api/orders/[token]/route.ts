import { orderVersion } from "@/lib/domain/order"
import { getOrderByToken } from "@/lib/store"

/*
 * What the buyer's order page polls to know when to refresh itself: one
 * Firestore read, no order details. Reading also expires an overdue order,
 * so an open page flips to "Expired" on time.
 */
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[token]">) {
  const { token } = await ctx.params
  const order = await getOrderByToken(token)
  if (!order) return Response.json({ error: "not_found" }, { status: 404, headers: HEADERS })
  return Response.json({ version: orderVersion(order) }, { headers: HEADERS })
}
