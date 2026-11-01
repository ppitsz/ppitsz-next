"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Tag and status badge. Not interactive, so the shape is a small radius,
 * never a capsule (capsules are for things you press). Status is always shown
 * in words; `dot` adds the small leading dot status badges carry.
 * Division codes are not badges: use LineBadge.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2 type-kicker whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        tag: "bg-surface text-muted",
        outline: "border-border-strong bg-transparent text-text",
        neutral: "bg-surface-strong text-muted",
        success: "bg-success-subtle text-success-text",
        warning: "bg-warning-subtle text-warning-text",
        danger: "bg-danger-subtle text-danger-text",
        highlight: "bg-highlight text-highlight-fg",
      },
    },
    defaultVariants: {
      variant: "tag",
    },
  }
)

function Badge({
  className,
  variant = "tag",
  dot = false,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot && (
              <span
                aria-hidden
                data-slot="badge-dot"
                className="size-1.5 shrink-0 rounded-full bg-current"
              />
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
