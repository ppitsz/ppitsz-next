"use client"

import { ErrorMessage } from "@/components/error-message"

/** A dashboard page that failed to render, under the staff header. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorMessage error={error} retry={retry}>
      If it keeps failing, tell IT the error code below. The printed pickup list works without the internet.
    </ErrorMessage>
  )
}
