"use client"

import { ErrorMessage } from "@/components/error-message"

/** A responder page that failed to render: the (public) layout already draws the header. */
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorMessage error={error} retry={retry}>
      If you were signing up, check your email for a ticket before signing up again.
    </ErrorMessage>
  )
}
