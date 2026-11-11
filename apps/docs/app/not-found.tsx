import type { Metadata } from "next"
import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

export const metadata: Metadata = { title: "Page not found" }

/** Unmatched URLs render with only the root layout, which has no <main>, so this brings its own. */
export default function NotFound() {
  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <PageNotFound>
        The address may be mistyped, or the page has moved. Go back to the{" "}
        <Link as={NextLink} href="/">
          Jaringan overview
        </Link>
        .
      </PageNotFound>
    </main>
  )
}
