import { getStaff } from "@/lib/server/auth"
import { countAwaitingVerification } from "@/lib/store"

/** The number of proofs waiting in every campaign, polled by the dashboard header for admins. */
export async function GET() {
  const staff = await getStaff()
  if (staff?.role !== "admin") return Response.json({ error: "unauthorized" }, { status: 401 })
  const awaiting = await countAwaitingVerification()
  return Response.json({ awaiting }, { headers: { "Cache-Control": "no-store" } })
}
