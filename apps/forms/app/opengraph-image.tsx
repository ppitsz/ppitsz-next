import { ogSize, stationSignImage } from "@/lib/og"

export const alt = "PPITSZ Forms: event sign-ups and forms of PPIT Shenzhen"
export const size = ogSize
export const contentType = "image/png"

/** Forms' share image, for every page without its own. */
export default function Image() {
  return stationSignImage({
    title: "PPITSZ Forms",
    kicker: "PPIT Shenzhen",
    details: "Event sign-ups, tickets and forms",
  })
}
