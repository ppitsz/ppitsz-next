import type { Metadata } from "next"
import { Archivo, Atkinson_Hyperlegible_Next, Noto_Sans_SC } from "next/font/google"

import "@ppitsz/ui/globals.css"
import "./docs.css"
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
// No Chinese subset exists in next/font, so preload must be false. Browsers
// download only the unicode-range slices a page actually uses.
const notoSansSC = Noto_Sans_SC({
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-sc",
})

export const metadata: Metadata = {
  title: {
    default: "Jaringan · PPIT Shenzhen design system",
    template: "%s · Jaringan",
  },
  description:
    "Jaringan is the design system for PPIT Shenzhen websites: the metro network as a visual language, built on shadcn/ui.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${atkinson.variable} ${notoSansSC.variable}`}
    >
      <body>
        <ThemeProvider>
          <SkipLink>Skip to content</SkipLink>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
