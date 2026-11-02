import { settleOverdueHolds } from "@/lib/store"

/*
 * Settles overdue holds of every campaign. Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`. The store already settles whenever
 * orders or products are read and before stock is taken, so this only tidies
 * up campaigns nobody is looking at.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  const expired = await settleOverdueHolds()
  return Response.json({ expired })
}
