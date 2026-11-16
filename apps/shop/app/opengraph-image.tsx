import { ogSize, stationSignImage } from "@/lib/og"

export const alt = "PPITSZ Shop: food and merchandise from PPIT Shenzhen"
export const size = ogSize
export const contentType = "image/png"

/** The shop's share image, for every page without its own. */
export default function Image() {
  return stationSignImage({
    title: "PPITSZ Shop",
    kicker: "PPIT Shenzhen",
    details: "Food and merchandise, picked up or delivered",
    line: "danus",
    lines: ["danus"],
  })
}
