"use client"

import { ErrorMessage } from "@/components/error-message"

/** A buyer page that failed to render: the (public) layout already draws the header. */
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorMessage error={error} retry={retry}>
      If you were placing an order, check Your orders before ordering again.
    </ErrorMessage>
  )
}
