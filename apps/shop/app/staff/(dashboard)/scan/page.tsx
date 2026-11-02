import type { Metadata } from "next"
import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requireStaff } from "@/lib/server/auth"
import { Scanner } from "@/components/staff/scanner"

export const metadata: Metadata = { title: "Scan QR" }

export default async function ScanPage() {
  await requireStaff()

  return (
    <Container narrow className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-2">
        <p className="type-kicker text-accent-text">Pickup at the booth</p>
        <h1 className="type-display-lg text-text">Scan QR</h1>
      </div>
      <Scanner />
      <p className="border-t pt-6 type-body-sm text-muted">
        In case the booth internet goes down: print the{" "}
        <Link as={NextLink} href="/staff/print/pickup">
          pickup list
        </Link>{" "}
        before the event starts.
      </p>
    </Container>
  )
}
