import { connection } from "next/server"

import { orderingNote } from "@/lib/campaign-copy"
import { ogSize, stationSignImage } from "@/lib/og"
import { visibleCampaign } from "@/lib/server/buyer-campaign"

export const alt = "A PPITSZ Shop campaign by PPIT Shenzhen"
export const size = ogSize
export const contentType = "image/png"

/** A campaign's share image: its name and when to order, as a station sign. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const campaign = await visibleCampaign((await params).slug)
  if (!campaign || campaign.status === "draft") {
    return stationSignImage({ title: "PPITSZ Shop", kicker: "PPIT Shenzhen", line: "danus", lines: ["danus"] })
  }
  return stationSignImage({
    title: campaign.name,
    kicker: "PPIT Shenzhen",
    details: campaign.status === "closed" ? "This campaign has ended" : orderingNote(campaign, new Date()),
    line: "danus",
    lines: ["danus"],
  })
}
