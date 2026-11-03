import type { Metadata, Viewport } from "next"
import { Archivo, Atkinson_Hyperlegible_Next } from "next/font/google"

import "@ppitsz/ui/globals.css"
import { Toaster } from "@ppitsz/ui/components/sonner"
import { SkipLink } from "@ppitsz/ui/components/blocks/brand"
import { menuAccount } from "@ppitsz/accounts/avatar"
import { isPortalAdmin } from "@ppitsz/accounts/roles"
import { getSession } from "@ppitsz/accounts/session"
import { transferApps } from "@ppitsz/accounts/urls"
import { Chrome } from "@/components/chrome"
import { ThemeProvider } from "@/components/theme-provider"

// Fonts load only through next/font, which self-hosts them. Never the
// Google Fonts CDN, which is unreliable from mainland China. No Noto Sans SC,
// as in the shop: nothing here is written in Chinese.
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

export const metadata: Metadata = {
  title: { default: "PPITSZ Account", template: "%s · PPITSZ Account" },
  description: "One account for the PPIT Shenzhen shop, forms and every other PPIT Shenzhen app.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession()
  const me = session ? await menuAccount() : null
  const account = session && me ? { ...me, portalAdmin: await isPortalAdmin(session.uid) } : null
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${atkinson.variable}`}>
      <body>
        <ThemeProvider>
          <SkipLink />
          <Chrome account={account} transfers={transferApps("account")}>
            {children}
          </Chrome>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
