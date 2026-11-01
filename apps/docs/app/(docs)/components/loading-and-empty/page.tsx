import type { Metadata } from "next"

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { Skeleton } from "@ppitsz/ui/components/skeleton"
import { Spinner } from "@ppitsz/ui/components/spinner"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Loading and empty" }

const SECTIONS = [
  { id: "skeleton", label: "Skeleton" },
  { id: "spinner", label: "Spinner" },
  { id: "empty", label: "Empty state" },
]

export default function LoadingEmptyPage() {
  return (
    <DocPage
      href="/components/loading-and-empty"
      kicker="Components · shadcn skeleton, spinner, empty"
      title="Loading and empty"
      lede="Static shapes while loading, one plain sentence when there is nothing to show. No shimmer, no illustrations."
      sections={SECTIONS}
    >
      <DocSection id="skeleton" title="Skeleton" intro={<p>Static <code>surface</code> shapes matching the real layout, with <code>aria-busy=&quot;true&quot;</code> on the container. Never a shimmer or a pulse.</p>}>
        <Example layout="block" code={`<ol aria-busy="true">
  <li><Skeleton className="h-16 w-24" /> <Skeleton className="h-6 w-2/3" /></li>
</ol>`}>
          <ol aria-busy="true" aria-label="Loading events" className="flex flex-col border-t">
            {[0, 1, 2].map((i) => (
              <li key={i} className="grid grid-cols-[6rem_1fr] gap-6 border-b py-5">
                <Skeleton className="h-16" />
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </li>
            ))}
          </ol>
        </Example>
      </DocSection>

      <DocSection id="spinner" title="Spinner" intro={<p>Only for loading: inside a busy button, or a field checking a student ID. Decorative by default (the label carries the state); pass <code>label</code> when it stands alone. It stops under reduced motion.</p>}>
        <Example code={`<Spinner label="Loading schedule" />`}>
          <Spinner className="size-5" label="Loading schedule" />
          <span className="type-body-sm text-muted">Loading schedule…</span>
        </Example>
      </DocSection>

      <DocSection id="empty" title="Empty state" intro={<p>One plain sentence plus a link. No illustrations, so the shadcn <code>EmptyMedia</code> slot is gone.</p>}>
        <Example layout="block" code={`<Empty>
  <EmptyHeader>
    <EmptyTitle>No upcoming events yet.</EmptyTitle>
    <EmptyDescription>Follow <a href="…">our Instagram</a> for the latest news.</EmptyDescription>
  </EmptyHeader>
</Empty>`}>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No upcoming events yet.</EmptyTitle>
              <EmptyDescription>
                Follow <a href="https://www.instagram.com/ppitshenzhen/">our Instagram</a> for the latest news.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Example>
        <Prose>
          <p>Other empty states follow the same shape: “No news yet.”, “No photos for this event yet.”</p>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
