import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Card: a contained soft panel. Use only for forms, login, notices, the
 * event registration panel, the Forms list and admin. Events, articles and
 * members are rows and portraits, not cards. Never three or more identical
 * cards in a row on public pages; never an icon above the title; never nest.
 */
const cardVariants = cva(
  "group/card relative flex flex-col gap-(--card-spacing) rounded-xl py-(--card-spacing) text-text [--card-spacing:--spacing(6)] data-[size=sm]:[--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl",
  {
    variants: {
      variant: {
        filled: "bg-surface",
        outline: "border border-border",
        /** Pair with CardLink: the title link is stretched over the card. */
        link: [
          "border border-border transition-colors duration-(--duration-fast) ease-out hover:border-border-strong",
          "has-[[data-slot=card-link]:focus-visible]:outline-2 has-[[data-slot=card-link]:focus-visible]:outline-offset-2 has-[[data-slot=card-link]:focus-visible]:outline-focus",
        ],
      },
    },
    defaultVariants: {
      variant: "filled",
    },
  }
)

function Card({
  className,
  variant,
  size = "md",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "md" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-2 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardKicker({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-kicker"
      className={cn("type-kicker text-muted", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "type-heading-lg text-text group-data-[size=sm]/card:type-heading-md",
        className
      )}
      {...props}
    />
  )
}

/**
 * The title link of a `variant="link"` card, stretched over the whole card.
 * Pass `as={NextLink}` for client-side navigation.
 */
function CardLink<T extends React.ElementType = "a">({
  as,
  className,
  ...props
}: { as?: T } & Omit<React.ComponentProps<T>, "as">) {
  const Component: React.ElementType = as ?? "a"
  return (
    <Component
      data-slot="card-link"
      className={cn(
        "underline-offset-4 outline-none after:absolute after:inset-0 after:rounded-xl group-hover/card:underline",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("type-body-sm text-muted", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "relative z-10 col-start-2 row-span-3 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing) type-body", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "relative z-10 flex flex-wrap items-center gap-3 px-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardKicker,
  CardTitle,
  CardLink,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
