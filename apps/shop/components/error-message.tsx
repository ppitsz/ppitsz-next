"use client"

import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"

/**
 * What an error boundary shows, without a header: the layout around it
 * decides that. The server already sent the error to the alert chat
 * (instrumentation.ts); its digest here lets IT match the two.
 */
export function ErrorMessage({
  error,
  retry,
  children,
}: {
  error: unknown
  retry: () => void
  /** A sentence for this section's people, after "Try again in a moment." */
  children?: React.ReactNode
}) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null
  return (
    <Container narrow className="flex flex-col items-start gap-4 py-16">
      <h1 className="type-display-xl text-text">Something went wrong</h1>
      <p className="max-w-[66ch] type-lede text-muted">
        This is on our side. Try again in a moment. {children}
      </p>
      <Button variant="primary" onClick={() => retry()}>
        Try again
      </Button>
      {digest && <p className="type-caption text-muted">Error code {digest}</p>}
    </Container>
  )
}
