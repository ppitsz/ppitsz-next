import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { default: "Forms dashboard", template: "%s · Forms dashboard" },
  robots: { index: false, follow: false },
}

export default function StaffSectionLayout({ children }: { children: React.ReactNode }) {
  return children
}
