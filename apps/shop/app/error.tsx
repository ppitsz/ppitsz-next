"use client"

import { ErrorMessage } from "@/components/error-message"

/**
 * Errors no section caught, such as a section's own layout failing while it
 * reads the session. Rendered with only the root layout, so no header.
 */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorMessage error={error} retry={retry} />
}
