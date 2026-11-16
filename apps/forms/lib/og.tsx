import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { OG_SIZE, OgStationSign, type OgStationSignProps } from "@ppitsz/ui/components/og/station-sign"

/*
 * Share images: the Jaringan station sign, drawn by next/og. Archivo comes
 * from assets/fonts (OFL), since next/font's files aren't readable here;
 * next.config traces them into the image routes.
 */

const fonts = Promise.all(
  ([600, 800] as const).map(async (weight) => ({
    name: "Archivo",
    data: await readFile(join(process.cwd(), `assets/fonts/archivo-latin-${weight}-normal.woff`)),
    weight,
    style: "normal" as const,
  }))
)

export const ogSize = OG_SIZE

export async function stationSignImage(props: Omit<OgStationSignProps, "app">) {
  return new ImageResponse(<OgStationSign app="PPITSZ Forms" {...props} />, { ...OG_SIZE, fonts: await fonts })
}
