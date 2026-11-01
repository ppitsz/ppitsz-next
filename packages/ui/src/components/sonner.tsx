"use client"

import {
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Toaster as Sonner, toast, type ExternalToast, type ToasterProps } from "sonner"

/*
 * Toast. Rendered once in the root layout. Toasts confirm things that
 * already happened ("Form sent"); blocking errors go inline. Never
 * move focus to a toast, and make every toast action reachable elsewhere.
 * Styling is all tokens (sonner runs unstyled), so it follows the theme and
 * tone scopes with no theme prop.
 */

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      visibleToasts={3}
      closeButton
      containerAriaLabel="Notifications"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon aria-hidden className="size-5 text-success" />,
        info: <InfoIcon aria-hidden className="size-5 text-text" />,
        warning: <WarningIcon aria-hidden className="size-5 text-warning" />,
        error: <WarningCircleIcon aria-hidden className="size-5 text-danger" />,
        loading: (
          <CircleNotchIcon aria-hidden className="size-5 animate-spin text-muted" />
        ),
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: "Close notification",
        duration: 5000,
        classNames: {
          toast:
            "group/toast relative flex w-full items-start gap-3 rounded-xl border border-border border-s-4 border-s-text bg-surface-raised py-3.5 ps-4 pe-12 text-text shadow-lg sm:w-96",
          success: "border-s-success",
          info: "border-s-text",
          warning: "border-s-warning",
          error: "border-s-danger",
          icon: "mt-0.5 flex shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-1",
          title: "type-ui text-text",
          description: "type-body-sm text-muted",
          actionButton:
            "mt-2 inline-flex h-9 shrink-0 items-center rounded-full border-2 border-text px-4 type-ui text-text hover:bg-surface-strong",
          cancelButton:
            "mt-2 inline-flex h-9 shrink-0 items-center rounded-full px-4 type-ui text-text hover:bg-surface-strong",
          closeButton:
            "absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-full text-text hover:bg-surface-strong [&_svg]:size-4",
        },
      }}
      {...props}
    />
  )
}

type NotifyOptions = Omit<ExternalToast, "duration">

/**
 * Toasts with their timing built in: success and info dismiss after 5s
 * (8s with an action); warning and danger stay until closed. The timer pauses
 * on hover and focus.
 */
const notify = {
  success: (title: string, options?: NotifyOptions) =>
    toast.success(title, { ...options, duration: options?.action ? 8000 : 5000 }),
  info: (title: string, options?: NotifyOptions) =>
    toast.info(title, { ...options, duration: options?.action ? 8000 : 5000 }),
  warning: (title: string, options?: NotifyOptions) =>
    toast.warning(title, { ...options, duration: Infinity }),
  danger: (title: string, options?: NotifyOptions) =>
    toast.error(title, { ...options, duration: Infinity }),
}

export { Toaster, notify, toast }
