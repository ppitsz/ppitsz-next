import type { Metadata, Viewport } from "next"
import { Archivo, Atkinson_Hyperlegible_Next } from "next/font/google"

import "@ppitsz/ui/globals.css"
import { Toaster } from "@ppitsz/ui/components/sonner"
import { SkipLink } from "@ppitsz/ui/components/blocks/brand"
import { ThemeProvider } from "@/components/theme-provider"

// Fonts load only through next/font, which self-hosts them. Never the
// Google Fonts CDN, which is unreliable from mainland China.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
})
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-atkinson",
})
// No Noto Sans SC: the shop's pages are English only (ADR 0007). Loading it means
// fetching ~200 unicode-range slices from Google, which fails from China in
// `next dev`. Any stray Chinese text (a name in a payment account) falls back
// to the system stack in globals.css: PingFang SC, Microsoft YaHei.
// Add it back, as in apps/docs, if a page ever carries Chinese copy.

export const metadata: Metadata = {
  title: {
    default: "PPITSZ Shop",
    template: "%s · PPITSZ Shop",
  },
  description:
    "Order food and merchandise from PPIT Shenzhen, pay, then pick it up or have it delivered.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${atkinson.variable}`}
    >
      <body>
        <ThemeProvider>
          <SkipLink />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
