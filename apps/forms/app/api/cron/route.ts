import { processQueue } from "@/lib/mail/queue"
import { reportError } from "@/lib/server/alerts"
import { formsToPurge, purgeResponses } from "@/lib/store"
import { deleteFormUploads } from "@/lib/store/media"

export const maxDuration = 300

/*
 * The daily tidy-up (vercel.json): emails that are still due (retries and
 * anything a crashed send left behind), and the 90-day purge of ended
 * forms. Most emails never wait for this: they go out right after the
 * request that queued them.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  const now = new Date()
  const sent = await processQueue()
  let purged = 0
  for (const form of await formsToPurge(now)) {
    try {
      await deleteFormUploads(form.id)
      await purgeResponses(form, now)
      purged++
    } catch (error) {
      reportError(error, `purge ${form.id}`)
    }
  }
  return Response.json({ sent, purged })
}
