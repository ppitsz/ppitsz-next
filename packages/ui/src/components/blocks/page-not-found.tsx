import { cn } from "@ppitsz/ui/lib/utils"
import { Container } from "@ppitsz/ui/components/container"

/*
 * Page not found: what every 404 shows, without a header (the layout around
 * it decides that). The heading is the network's, the same in every app;
 * `children` say the real thing in one or two sentences: why the link may
 * be wrong here, and a link to where to go instead.
 */
function PageNotFound({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Container narrow className={cn("flex flex-col gap-4 py-16", className)}>
      <p className="type-kicker text-accent-text">Page not found</p>
      <h1 className="type-display-xl text-text">This station isn&apos;t on the network</h1>
      <p className="max-w-[66ch] type-lede text-muted">{children}</p>
    </Container>
  )
}

export { PageNotFound }
