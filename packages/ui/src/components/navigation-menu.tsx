"use client"

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { cva } from "class-variance-authority"
import { CaretDownIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import { floatingPanelClasses } from "@ppitsz/ui/components/popover"

/**
 * Navigation menu: the site header's links, and any panel of links opened
 * from it (the Transfer list). Restyled: top-level links and triggers are
 * capsules in type-ui with a surface-strong hover; the panel is the floating
 * panel of popovers and menus, and it fades in rather than sliding or
 * zooming. A trigger opens on click as well as hover, so nothing is
 * hover-only. Mark the current page with `active` on its link.
 */
function NavigationMenu({
  align = "start",
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Root.Props &
  Pick<NavigationMenuPrimitive.Positioner.Props, "align">) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

/** Top-level links and triggers: a capsule, quiet until hovered or open. */
const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger relative inline-flex min-h-11 w-max items-center justify-center gap-1.5 rounded-full px-3.5 type-ui whitespace-nowrap text-text outline-none transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong disabled:pointer-events-none disabled:text-subtle data-popup-open:bg-surface-strong data-open:bg-surface-strong"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}
      <CaretDownIcon
        aria-hidden
        weight="bold"
        className="size-4 transition-transform duration-(--duration-base) ease-out group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "h-full w-auto p-2 transition-opacity duration-(--duration-base) ease-out data-starting-style:opacity-0 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--duration-base) ease-out data-instant:transition-none",
          className
        )}
        {...props}
      >
        <NavigationMenuPrimitive.Popup
          className={cn(
            floatingPanelClasses,
            "relative h-(--popup-height) w-(--popup-width) transition-[opacity,width,height] duration-(--duration-base) ease-out data-starting-style:opacity-0 data-ending-style:opacity-0"
          )}
        >
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
}

/** A link: inside a panel, a full-width row (rounded-lg, like menu items). */
function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 type-ui text-text outline-none transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong focus-visible:bg-surface-strong [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    />
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
}
