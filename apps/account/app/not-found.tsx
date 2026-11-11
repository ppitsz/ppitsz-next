import type { Metadata } from "next"
import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <PageNotFound>
      The link may be old, or the page is only for Portal admins. Go to{" "}
      <Link as={NextLink} href="/">
        your account
      </Link>
      .
    </PageNotFound>
  )
}
