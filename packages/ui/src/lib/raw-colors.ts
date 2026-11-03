import type { LineCode } from "@ppitsz/ui/lib/network"

/*
 * Jaringan colors as hex, for the two places CSS tokens can't reach: email
 * bodies (clients ignore stylesheets and variables) and generated share
 * images (Satori draws inline styles only). Each value is the OKLCH token
 * from globals.css converted to sRGB; change them together. Pages never
 * use these: they use the semantic tokens.
 */

export const RAW = {
  white: "#FFFFFF",
  /** beton-50: surface */
  surface: "#F8F9FB",
  /** beton-200: border */
  border: "#E3E6EB",
  /** beton-400: muted on ink */
  inkMuted: "#A6ABB2",
  /** beton-500: border-strong */
  borderStrong: "#7E848B",
  /** beton-600: muted */
  muted: "#61676E",
  /** beton-800: border on ink */
  inkBorder: "#2E333A",
  /** beton-900: ink, lifted */
  inkRaised: "#1B1E23",
  /** beton-950: text, and the ink of station screens */
  ink: "#0D1013",
  /** merah-600: accent (the primary button) */
  accent: "#D61E17",
  /** merah-700: accent text on light */
  accentText: "#AC1B14",
  /** merah-500: the brand line */
  accentLine: "#F5392C",
  /** amber-300: exit yellow */
  exit: "#FBC456",
} as const

/** Division lines on light (badges with white text). */
export const RAW_LINES: Record<LineCode, string> = {
  bph: "#D61E17",
  danus: "#C94E0C",
  depol: "#1D8139",
  humas: "#0D6ABB",
  it: "#037A84",
  medkref: "#BC2B74",
  pka: "#6D44D6",
  sosbud: "#9623A8",
}

/** Division lines on ink (badges with ink text), as in dark mode and tone-ink. */
export const RAW_LINES_ON_INK: Record<LineCode, string> = {
  bph: "#F66E5E",
  danus: "#FA934E",
  depol: "#50C76A",
  humas: "#60AAF3",
  it: "#43C2CF",
  medkref: "#F471AA",
  pka: "#A492FB",
  sosbud: "#D879E6",
}
