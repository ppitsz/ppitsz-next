import { getStaff, mayAccess } from "@/lib/server/auth"
import { getForm } from "@/lib/store"
import { readMedia, uploadFormId } from "@/lib/store/media"

/**
 * A file answer, for the signed-in organizers of its form only. Never cached by
 * anything shared. Uploads are only ever images or PDFs (checked on upload),
 * so they open in the browser and nothing in them runs on our origin.
 */
export async function GET(_request: Request, ctx: RouteContext<"/staff/files/[...path]">) {
  const { path } = await ctx.params
  const key = path.map(decodeURIComponent).join("/")
  const formId = uploadFormId(key)
  const staff = await getStaff()
  const form = formId && staff ? await getForm(formId) : null
  if (!staff || !form || !mayAccess(staff, form)) return new Response("Not found", { status: 404 })

  const media = await readMedia(key)
  if (!media) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
