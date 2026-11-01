import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Skeleton: a static `surface` shape matching the real layout. No
 * shimmer, no pulse. Put aria-busy="true" on the container that is loading.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("rounded-md bg-surface", className)}
      {...props}
    />
  )
}

export { Skeleton }
