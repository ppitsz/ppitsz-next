import { cookies } from "next/headers"

import type { Campaign } from "../domain/types"

/*
 * The campaign this device works on in the dashboard: Kasir, Products, Recap
 * and Settings follow it. Verify, Scan, Orders and the pickup list
 * cover every campaign. Kept in a cookie so server pages know it.
 */

export const CAMPAIGN_COOKIE = "shop_campaign"
export const CAMPAIGN_COOKIE_MAX_AGE = 365 * 86_400

/**
 * The picked campaign among `campaigns` (already in display order), or the
 * first open one, or the first one. Null when there are none.
 */
export async function pickedCampaign(campaigns: Campaign[]): Promise<Campaign | null> {
  const id = (await cookies()).get(CAMPAIGN_COOKIE)?.value
  return (
    campaigns.find((c) => c.id === id) ?? campaigns.find((c) => c.status === "open") ?? campaigns[0] ?? null
  )
}
