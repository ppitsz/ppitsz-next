import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

/** notFound() on a dashboard page: a deleted form or response, or one that isn't yours. */
export default function StaffNotFound() {
  return (
    <PageNotFound>
      This form or response doesn&apos;t exist, or you aren&apos;t one of its organizers. Organizer access ends when the form has ended.{" "}
      <Link as={NextLink} href="/staff">
        See your forms
      </Link>
      .
    </PageNotFound>
  )
}
