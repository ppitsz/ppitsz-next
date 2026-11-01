"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { WarningCircleIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import { Button } from "@ppitsz/ui/components/button"

/*
 * Destructive confirmation. Pair a danger action that names what it does
 * ("Reject applicant", never "OK") with "Cancel". Initial focus lands on
 * "Cancel". The action does not close the dialog by itself: close it from the
 * caller once the work is done.
 */

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-backdrop data-open:animate-fade",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  initialFocus,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  const popupRef = React.useRef<HTMLDivElement>(null)
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        ref={popupRef}
        data-slot="alert-dialog-content"
        initialFocus={
          initialFocus ??
          (() =>
            popupRef.current?.querySelector<HTMLElement>(
              "[data-slot=alert-dialog-cancel]"
            ) ?? true)
        }
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-xl border border-border bg-surface-raised p-6 text-text shadow-xl outline-none data-open:animate-enter sm:max-w-md",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 *:w-full sm:flex-row sm:justify-end sm:*:w-auto",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("type-heading-lg text-text", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "type-body text-muted *:[a]:text-accent-text *:[a]:underline *:[a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

/** The destructive action: a danger button with its leading WarningCircle. */
function AlertDialogAction({
  className,
  variant = "danger",
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      variant={variant}
      className={cn(className)}
      {...props}
    >
      {variant === "danger" && <WarningCircleIcon aria-hidden />}
      {children}
    </Button>
  )
}

function AlertDialogCancel({
  className,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant="secondary" />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
