import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

/** The buyer's 404, without a header: the layout around it decides that. */
export function NotFoundMessage() {
  return (
    <PageNotFound>
      An order link may have been cut off when copied. Open it again from the original message, or check{" "}
      <Link as={NextLink} href="/orders">
        Your orders
      </Link>
      .
    </PageNotFound>
  )
}
