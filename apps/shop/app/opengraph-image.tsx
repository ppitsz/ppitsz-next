import { ogSize, stationSignImage } from "@/lib/og"

export const alt = "PPITSZ Shop: food and merchandise from Danus PPIT Shenzhen"
export const size = ogSize
export const contentType = "image/png"

/** The shop's share image, for every page without its own. */
export default function Image() {
  return stationSignImage({
    title: "PPITSZ Shop",
    kicker: "Danus PPIT Shenzhen",
    details: "Food and merchandise, picked up or delivered",
    line: "danus",
    lines: ["danus"],
  })
}
