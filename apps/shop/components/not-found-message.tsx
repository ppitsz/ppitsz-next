import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"

/** The buyer's 404, without a header: the layout around it decides that. */
export function NotFoundMessage() {
  return (
    <Container narrow className="flex flex-col gap-4 py-16">
      <h1 className="type-display-xl text-text">Page not found</h1>
      <p className="max-w-[66ch] type-lede text-muted">
        An order link may have been cut off when copied. Open it again from the original message, or check{" "}
        <Link as={NextLink} href="/orders">
          Your orders
        </Link>
        .
      </p>
    </Container>
  )
}
