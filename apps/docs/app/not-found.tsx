import type { Metadata } from "next"
import Link from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link as TextLink } from "@ppitsz/ui/components/link"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <Container className="flex min-h-[60dvh] flex-col justify-center gap-6 py-16">
        <p className="type-kicker text-accent-text">404</p>
        <h1 className="type-display-lg text-text">This page isn't on the network</h1>
        <p className="max-w-[46ch] type-lede text-muted">
          The address may be mistyped, or the page has moved.
        </p>
        <TextLink as={Link} variant="standalone" href="/">
          Back to the Jaringan overview
        </TextLink>
      </Container>
    </main>
  )
}
