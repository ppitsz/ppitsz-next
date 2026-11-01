import * as React from "react"
import { ArrowRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react/ssr"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"

/*
 * Link. Not a shadcn component: shadcn styles links through Button's
 * `link` variant, which Jaringan drops so links never look like buttons.
 * - inline: in running text. accent-text, always underlined; the underline
 *   thickens on hover.
 * - standalone: "See all events →". type-ui in text color, underline on
 *   hover, the arrow nudges 2px (motion-safe).
 * Link text names its destination by itself. Never "Click here".
 * Pass `as={NextLink}` for client-side navigation.
 */
const linkVariants = cva("", {
  variants: {
    variant: {
      inline:
        "text-accent-text underline decoration-1 underline-offset-4 hover:decoration-2",
      standalone:
        "group/link inline-flex items-center gap-1.5 type-ui text-text underline-offset-4 hover:underline",
    },
  },
  defaultVariants: {
    variant: "inline",
  },
})

type LinkProps<T extends React.ElementType> = {
  as?: T
  /**
   * External destination: adds a trailing ArrowUpRight. With `newTab` it opens
   * in a new tab (only for Drive/SharePoint galleries, external forms and
   * PDFs) and adds a screen-reader note.
   */
  external?: boolean
  newTab?: boolean
  /** Screen-reader note for new tabs, in the page language. */
  newTabLabel?: string
} & VariantProps<typeof linkVariants> &
  Omit<React.ComponentProps<T>, "as">

function Link<T extends React.ElementType = "a">({
  as,
  variant,
  external = false,
  newTab = false,
  newTabLabel = "(opens in a new tab)",
  className,
  children,
  ...props
}: LinkProps<T>) {
  const Component: React.ElementType = as ?? "a"
  const isStandalone = variant === "standalone"
  return (
    <Component
      data-slot="link"
      className={cn(linkVariants({ variant }), className)}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      {...props}
    >
      {children}
      {newTab && <span className="sr-only"> {newTabLabel}</span>}
      {external ? (
        <ArrowUpRightIcon
          aria-hidden
          weight={isStandalone ? "regular" : "bold"}
          className={cn(
            "inline-block shrink-0",
            isStandalone ? "size-5" : "ms-0.5 size-4 align-[-0.125em]"
          )}
        />
      ) : (
        isStandalone && (
          <ArrowRightIcon
            aria-hidden
            className="size-5 shrink-0 transition-transform duration-(--duration-fast) ease-out motion-safe:group-hover/link:translate-x-0.5"
          />
        )
      )}
    </Component>
  )
}

export { Link, linkVariants }
