import * as React from "react"

import { getDivision, type LineCode } from "@ppitsz/ui/lib/network"
import { RAW, RAW_LINES_ON_INK } from "@ppitsz/ui/lib/raw-colors"

/*
 * The share image (1200 × 630) for a campaign, event or app: a station sign
 * in ink, as a link preview on WeChat, Instagram or WhatsApp. The line on
 * top, the lines that stop here, the name big, one line of when and where,
 * and along the bottom a short route arriving at the app's name.
 *
 * Rendered by next/og (Satori): inline styles only, every box with more
 * than one child is display:flex, and colors come from raw-colors. The app
 * passes Archivo 600 and 800 as "Archivo".
 */

export const OG_SIZE = { width: 1200, height: 630 }

export interface OgStationSignProps {
  /** "PPITSZ Shop", "PPITSZ Forms". */
  app: string
  /** The name: a campaign, an event. */
  title: string
  /** One short line above the name: "Danus PPIT Shenzhen", "Event". */
  kicker?: string
  /** When and where: "Order online until Mon, Mar 15". */
  details?: string
  /** The line along the top and the route. Brand red by default. */
  line?: LineCode
  /** Line badges before the kicker. */
  lines?: readonly LineCode[]
}

function Station({ color, here = false }: { color: string; here?: boolean }) {
  const ring = (
    <div
      style={{
        display: "flex",
        width: 30,
        height: 30,
        borderRadius: 999,
        // Passed stations and "here" are both filled; here adds the halo.
        background: color,
      }}
    />
  )
  if (!here) return ring
  return (
    <div style={{ display: "flex", padding: 5, borderRadius: 999, border: `6px solid ${color}` }}>{ring}</div>
  )
}

export function OgStationSign({ app, title, kicker, details, line, lines = [] }: OgStationSignProps) {
  const color = line ? RAW_LINES_ON_INK[line] : RAW.accentLine
  const titleSize = title.length > 44 ? 64 : title.length > 26 ? 80 : 104
  const segment = <div style={{ display: "flex", width: 96, height: 10, background: color }} />

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: RAW.ink,
        color: RAW.white,
        fontFamily: "Archivo",
        padding: "56px 72px 60px",
      }}
    >
      <div style={{ display: "flex", height: 14, borderRadius: 999, background: color }} />

      {(lines.length > 0 || kicker) && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 52 }}>
          {lines.map((code) => (
            <div
              key={code}
              style={{
                display: "flex",
                padding: "8px 14px",
                borderRadius: 8,
                background: RAW_LINES_ON_INK[code],
                color: RAW.ink,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              {getDivision(code).badge}
            </div>
          ))}
          {kicker && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: RAW.inkMuted,
              }}
            >
              {kicker}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: titleSize,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      {details && (
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, fontWeight: 600, color: RAW.inkMuted }}>
          {details}
        </div>
      )}

      <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Station color={color} />
          {segment}
          <Station color={color} />
          {segment}
          <Station color={color} here />
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{app}</div>
      </div>
    </div>
  )
}
