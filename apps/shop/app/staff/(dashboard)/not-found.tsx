import NextLink from "next/link"

import { Link } from "@ppitsz/ui/components/link"
import { PageNotFound } from "@ppitsz/ui/components/blocks/page-not-found"

/** notFound() on a dashboard page, under the Danus header: a deleted order, product or bundle. */
export default function DashboardNotFound() {
  return (
    <PageNotFound>
      This was deleted, or the link is wrong. Go back to{" "}
      <Link as={NextLink} href="/staff/orders">
        Orders
      </Link>{" "}
      or{" "}
      <Link as={NextLink} href="/staff/products">
        Products
      </Link>
      .
    </PageNotFound>
  )
}
