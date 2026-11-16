import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

/** The responder's 404, without a header: the layout around it decides that. */
export function NotFoundMessage() {
  return (
    <PageNotFound>
      A form or ticket link may have been cut off when copied. Open it again from the original message or email, or see the{" "}
      <Link as={NextLink} href="/">
        open forms
      </Link>
      .
    </PageNotFound>
  )
}
