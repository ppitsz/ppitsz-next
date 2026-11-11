"use client"

import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"

/** A page that failed to render, under the account header: a service disruption, posted like a station notice. */
export default function AccountError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null
  return (
    <Container narrow className="py-16">
      <ServiceNotice
        kind="change"
        label="Service disruption"
        headingLevel="h1"
        title="Something went wrong"
        action={
          <Button variant="primary" onClick={() => retry()}>
            Try again
          </Button>
        }
      >
        <p>This is on our side. Try again in a moment. If it keeps failing, tell IT the error code below.</p>
        {digest && <p className="type-caption text-muted">Error code {digest}</p>}
      </ServiceNotice>
    </Container>
  )
}
