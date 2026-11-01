import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Empty state: one plain sentence plus a link
 * ("No upcoming events yet."). No illustrations, so there is no media slot.
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-3 rounded-xl bg-surface p-6 text-left",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-[66ch] flex-col gap-1", className)}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-title"
      className={cn("type-heading-md text-text", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "type-body text-muted [&>a]:text-accent-text [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:decoration-2",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent }
