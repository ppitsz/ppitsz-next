import { getStaff } from "@/lib/server/auth"
import { getOrder, readMedia } from "@/lib/store"

/** A buyer's transfer screenshot, for signed-in staff only. Never cached by shared caches. */
export async function GET(_request: Request, ctx: RouteContext<"/staff/proofs/[orderId]">) {
  if (!(await getStaff())) return new Response("Unauthorized", { status: 401 })
  const { orderId } = await ctx.params
  const order = await getOrder(orderId)
  const path = order?.payment.proofPath
  const media = path ? await readMedia(path) : null
  if (!media) return new Response("Not found", { status: 404 })

  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
