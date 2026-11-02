import { cache } from "react"

import type { Campaign } from "../domain/types"
import { getCampaignBySlug } from "../store"
import { getStaff } from "./auth"

/**
 * The campaign at /[slug] as a visitor may see it: a draft only for signed-in
 * staff (a preview), anyone else gets null and a 404. Once per request.
 */
export const visibleCampaign = cache(async (slug: string): Promise<Campaign | null> => {
  const campaign = await getCampaignBySlug(slug)
  if (!campaign) return null
  if (campaign.status === "draft" && !(await getStaff())) return null
  return campaign
})
