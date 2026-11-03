import * as React from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"

/*
 * Wayfinding signs: a station's overhead sign as a list of destinations.
 * The board is always a tone-ink band; each sign is one row with an optional
 * lead cell (a pictogram, line badges or an exit badge), the destination
 * and the arrow. The arrow sits on the side the destination lies: before the
 * name for "left", after it otherwise. A sign with href is a row whose title
 * link is stretched over it, like departure board rows.
 *
 * Yellow belongs to exits: ExitBadge marks a way out of the app (another
 * site, another app, the socials). Lines and pictograms mark the way in.
 */

export type SignDirection = "ahead" | "left" | "right" | "out"

const ARROWS = {
  ahead: ArrowUpIcon,
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
  out: ArrowUpRightIcon,
} as const

/** On hover the arrow nudges 2px the way it points, like a standalone link. */
const NUDGES = {
  ahead: "motion-safe:group-hover/sign:-translate-y-0.5",
  left: "motion-safe:group-hover/sign:-translate-x-0.5",
  right: "motion-safe:group-hover/sign:translate-x-0.5",
  out: "motion-safe:group-hover/sign:translate-x-0.5 motion-safe:group-hover/sign:-translate-y-0.5",
} as const

/** The board: an ink band holding one or more signs. */
function SignBoard({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sign-board"
      className={cn(
        "tone-ink @container flex flex-col overflow-hidden rounded-xl",
        className
      )}
      {...props}
    />
  )
}

/** One destination on a sign board. */
function Sign({
  title,
  zh,
  description,
  lead,
  direction,
  href,
  linkAs,
  newTab = false,
  newTabLabel = "(opens in a new tab)",
  headingLevel,
  className,
  ...props
}: Omit<React.ComponentProps<"li">, "title"> & {
  /** The destination, as the screen names it. */
  title: React.ReactNode
  /** Chinese name, under the title. Only for places: campuses, venues. */
  zh?: React.ReactNode
  /** One short line: what is there. */
  description?: React.ReactNode
  /** A SignPictogram, LineBadges or ExitBadge. */
  lead?: React.ReactNode
  /** Where the arrow points. "out" for a way out of the app. None: no arrow. */
  direction?: SignDirection
  href?: string
  linkAs?: React.ElementType
  newTab?: boolean
  /** Screen-reader note for new tabs. */
  newTabLabel?: string
  /** Wrap the title in a heading, when the signs are a page's sections. */
  headingLevel?: "h2" | "h3" | "h4"
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const Arrow = direction ? ARROWS[direction] : null
  const arrow = Arrow && (
    <Arrow
      aria-hidden
      weight="bold"
      className={cn(
        "size-7 shrink-0 text-text",
        href && "transition-transform duration-(--duration-fast) ease-out",
        href && direction && NUDGES[direction]
      )}
    />
  )
  const name = href ? (
    <Link
      href={href}
      data-slot="sign-link"
      className="outline-none after:absolute after:inset-0 underline-offset-4 group-hover/sign:underline"
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {title}
      {newTab && <span className="sr-only"> {newTabLabel}</span>}
    </Link>
  ) : (
    title
  )
  const Heading = headingLevel ?? "span"

  return (
    <li
      data-slot="sign"
      data-direction={direction}
      className={cn(
        "group/sign relative flex min-h-18 items-center gap-4 border-b px-4 py-4 last:border-b-0 @md:px-5",
        href &&
          "transition-colors duration-(--duration-fast) ease-out hover:bg-surface has-[[data-slot=sign-link]:focus-visible]:outline-2 has-[[data-slot=sign-link]:focus-visible]:-outline-offset-2 has-[[data-slot=sign-link]:focus-visible]:outline-focus",
        className
      )}
      {...props}
    >
      {direction === "left" && arrow}
      {lead && <span className="flex shrink-0 items-center gap-1">{lead}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading className="type-heading-sm text-text">{name}</Heading>
        {zh && (
          <span lang="zh-Hans" className="type-caption text-muted">
            {zh}
          </span>
        )}
        {description && <span className="type-caption text-muted">{description}</span>}
      </span>
      {direction !== "left" && arrow}
    </li>
  )
}

/** A pictogram tile: one Phosphor icon on a light square, as on station signs. */
function SignPictogram({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="sign-pictogram"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-text text-bg [&>svg]:size-6",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * The exit letter in exit yellow. Screen readers hear "Exit A". Only for ways
 * out of the app; the yellow appears nowhere else.
 */
function ExitBadge({
  letter,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** "A", "B", "C1". */
  letter: string
}) {
  return (
    <span data-slot="exit-badge" className={cn("exit-badge", className)} {...props}>
      <span className="sr-only">Exit </span>
      {letter}
    </span>
  )
}

export { SignBoard, Sign, SignPictogram, ExitBadge }
