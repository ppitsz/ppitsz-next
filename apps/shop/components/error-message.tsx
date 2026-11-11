"use client"

import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"

/**
 * What an error boundary shows, without a header: the layout around it
 * decides that. A service disruption, posted like a station notice. The
 * server already sent the error to the alert chat (instrumentation.ts); its
 * digest here lets IT match the two.
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
    <Container narrow className="py-16">
      <ServiceNotice
        kind="change"
        label="Service disruption"
        lines={["danus"]}
        headingLevel="h1"
        title="Something went wrong"
        action={
          <Button variant="primary" onClick={() => retry()}>
            Try again
          </Button>
        }
      >
        <p>This is on our side. Try again in a moment. {children}</p>
        {digest && <p className="type-caption text-muted">Error code {digest}</p>}
      </ServiceNotice>
    </Container>
  )
}
