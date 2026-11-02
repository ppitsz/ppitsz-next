import NextLink from "next/link"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"

/** notFound() on a dashboard page, under the Danus header: a deleted order, product or bundle. */
export default function DashboardNotFound() {
  return (
    <Container narrow className="flex flex-col gap-4 py-16">
      <h1 className="type-display-xl text-text">Not found</h1>
      <p className="max-w-[66ch] type-lede text-muted">
        This was deleted, or the link is wrong. Go back to{" "}
        <Link as={NextLink} href="/staff/orders">
          Orders
        </Link>{" "}
        or{" "}
        <Link as={NextLink} href="/staff/products">
          Products
        </Link>
        .
      </p>
    </Container>
  )
}
