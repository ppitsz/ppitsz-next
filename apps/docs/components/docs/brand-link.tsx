import Link from "next/link"

import { PpiMark } from "@ppitsz/ui/components/blocks/brand"

export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-sm">
      <PpiMark className="h-10" alt="" />
      <span className="flex flex-col">
        <span className="type-heading-md text-text">Jaringan</span>
        <span className="hidden type-caption text-muted sm:block">PPIT Shenzhen design system</span>
      </span>
    </Link>
  )
}
