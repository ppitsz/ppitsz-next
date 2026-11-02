import type { NextRequest } from "next/server"

import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { csvFileName, ordersCsv, productsCsv } from "@/lib/domain/export"
import { buildRecap } from "@/lib/domain/recap"
import { getStaff } from "@/lib/server/auth"
import { staffNames } from "@/lib/server/staff"
import { getCampaign, listBundles, listOrders, listProducts } from "@/lib/store"

/**
 * One campaign's recap as CSV, for admins: `?campaign=<id>&kind=orders`
 * is one row per order item, `kind=products` one row per variant and bundle.
 */
export async function GET(request: NextRequest) {
  const staff = await getStaff()
  if (staff?.role !== "admin") return new Response("Danus admins only.", { status: 401 })
  const campaign = await getCampaign(request.nextUrl.searchParams.get("campaign") ?? "")
  if (!campaign) return new Response("Campaign not found.", { status: 404 })

  const kind = request.nextUrl.searchParams.get("kind")
  const now = new Date()
  const orders = await listOrders(campaign.id, { now })
  let body: string
  if (kind === "orders") {
    const names = await staffNames(orders.map((o) => o.payment.verifiedBy))
    body = ordersCsv(campaign, orders, PAYMENT_METHOD_LABELS, (uid) => (uid && names.get(uid)) || "")
  } else if (kind === "products") {
    const [products, bundles] = await Promise.all([
      listProducts(campaign.id, { includeInactive: true, now }),
      listBundles(campaign.id, { includeInactive: true }),
    ])
    body = productsCsv(buildRecap(campaign, orders, products, bundles, PAYMENT_METHOD_LABELS))
  } else {
    return new Response("Use kind=orders or kind=products.", { status: 400 })
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(campaign, kind, now)}"`,
      "Cache-Control": "no-store",
    },
  })
}
