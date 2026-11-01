"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"
import { Button } from "@ppitsz/ui/components/button"

/*
 * Modal. A soft panel on surface-raised. Opening fades and rises 8px;
 * closing is instant. Rules the caller owns:
 * - Form dialogs pass `disablePointerDismissal` on <Dialog> (a backdrop click
 *   closes non-form dialogs only).
 * - While a confirm action is loading, ignore Esc and backdrop clicks by
 *   guarding onOpenChange.
 * - Never open on page load; never stack dialogs.
 */

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-backdrop data-open:animate-fade",
        className
      )}
      {...props}
    />
  )
}

const dialogContentVariants = cva(
  "fixed z-50 flex flex-col gap-5 bg-surface-raised text-text outline-none data-open:animate-enter",
  {
    variants: {
      size: {
        sm: "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-xl sm:max-w-md",
        md: "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-xl sm:max-w-xl",
        lg: "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-xl sm:max-w-5xl",
        /** Full screen: the mobile menu. */
        full: "inset-0 overflow-y-auto bg-bg p-4 sm:p-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function DialogContent({
  className,
  children,
  size,
  showCloseButton = true,
  closeLabel = "Close",
  ...props
}: DialogPrimitive.Popup.Props &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean
    /** Accessible name of the close icon button, in the page language. */
    closeLabel?: string
  }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label={closeLabel}
            render={
              <Button
                variant="quiet"
                size="icon"
                className="absolute top-3 right-3"
              />
            }
          >
            <XIcon aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-12", className)}
      {...props}
    />
  )
}

/** The dialog body: scrolls when long, header and footer stay put. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("-mx-6 min-h-0 flex-1 overflow-y-auto px-6 type-body", className)}
      {...props}
    />
  )
}

/** Actions: secondary, then primary or danger. Stacked full-width on phones. */
function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel = "Cancel",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  closeLabel?: string
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 *:w-full sm:flex-row sm:justify-end sm:*:w-auto",
        className
      )}
      {...props}
    >
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="secondary" />}>
          {closeLabel}
        </DialogPrimitive.Close>
      )}
      {children}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("type-heading-lg text-text", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "type-body text-muted *:[a]:text-accent-text *:[a]:underline *:[a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
}
