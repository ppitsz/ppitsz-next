import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"

export default function NotFound() {
  return (
    <Container narrow className="flex flex-col gap-4 py-16">
      <p className="type-kicker text-accent-text">Not found</p>
      <h1 className="type-display-xl text-text">This page doesn&apos;t exist</h1>
      <p className="max-w-[66ch] type-lede text-muted">The link may be old, or the page is only for Portal admins.</p>
      <NextLink href="/" className="type-ui text-accent-text underline-offset-4 hover:underline">
        Go to your account
      </NextLink>
    </Container>
  )
}
