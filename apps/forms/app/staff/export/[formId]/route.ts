import { slugify } from "@/lib/domain/form"
import { responsesCsv } from "@/lib/domain/results"
import { getStaff, mayAccess } from "@/lib/server/auth"
import { getForm, listResponses } from "@/lib/store"

/** Every response of a form as CSV, for its organizers. */
export async function GET(_request: Request, ctx: RouteContext<"/staff/export/[formId]">) {
  const { formId } = await ctx.params
  const staff = await getStaff()
  const form = staff ? await getForm(formId) : null
  if (!staff || !form || !mayAccess(staff, form)) return new Response("Not found", { status: 404 })
  const csv = responsesCsv(form, await listResponses(form.id))
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(form.title)}-responses.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
