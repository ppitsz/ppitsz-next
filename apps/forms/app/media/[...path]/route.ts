import { COVER_PREFIX, readMedia } from "@/lib/store/media"

/*
 * Form covers, streamed from Firebase Storage through our own domain so they
 * load in China without a VPN. File answers are not public: they go to the
 * form's organizers only, at /staff/files.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params
  const key = path.map(decodeURIComponent).join("/")
  if (key.includes("..") || !key.startsWith(COVER_PREFIX)) return new Response("Not found", { status: 404 })

  const media = await readMedia(key)
  if (!media) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
