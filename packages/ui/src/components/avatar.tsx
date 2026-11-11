"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Avatar: someone's photo in a circle (avatars are capsules, like everything
 * that names a person or a stop), or their initials while it loads or when
 * they have none. Restyled from shadcn: a hairline ring instead of a blended
 * border, initials in type-kicker on surface-strong, and an xl size for the
 * profile page. The image is decorative (alt=""): the name beside it says
 * who it is.
 */
function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg" | "xl"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border",
        "data-[size=sm]:size-6 data-[size=lg]:size-10 data-[size=xl]:size-24",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, alt = "", ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      alt={alt}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      aria-hidden
      className={cn(
        "flex size-full items-center justify-center bg-surface-strong type-kicker text-text",
        "group-data-[size=xl]/avatar:type-heading-lg",
        className
      )}
      {...props}
    />
  )
}

/** Overlapping avatars, each ringed in the page color. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-bg",
        className
      )}
      {...props}
    />
  )
}

/** "Malik Ihsan" → "MI"; an email or one word → its first letter. */
function initials(name: string) {
  const words = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, initials }
