import { readMedia } from "@/lib/store"

/*
 * Product and bundle photos, campaign covers and payment QRs, streamed from
 * Firebase Storage through our own domain so they load in China without a
 * VPN. `payment-accounts/` holds the payment accounts' QR images. Transfer proofs
 * are not public: they go to signed-in Danus staff only, at /staff/proofs.
 */
const PUBLIC_PREFIXES = ["products/", "bundles/", "campaigns/", "payment-accounts/"]

export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params
  const key = path.map(decodeURIComponent).join("/")
  if (key.includes("..") || !PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return new Response("Not found", { status: 404 })
  }

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
