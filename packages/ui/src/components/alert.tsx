import * as React from "react"
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * Notice: a status-tinted panel with a thick leading edge in the status
 * color, a status icon and a message. Danger shares the brand red family, so
 * it always carries its icon and words.
 */
const alertVariants = cva(
  "group/alert relative grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border-s-4 px-4 py-3.5 text-left text-text has-data-[slot=alert-action]:pr-14 *:[svg]:row-span-2 *:[svg]:mt-0.5 *:[svg]:size-5",
  {
    variants: {
      variant: {
        info: "border-s-text bg-surface *:[svg]:text-text",
        success: "border-s-success bg-success-subtle *:[svg]:text-success",
        warning: "border-s-warning bg-warning-subtle *:[svg]:text-warning",
        danger: "border-s-danger bg-danger-subtle *:[svg]:text-danger",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const ICONS = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  danger: WarningCircleIcon,
} as const

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>

function Alert({
  className,
  variant,
  live = false,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /**
     * Set when the notice appears after an action: info and success then use
     * role="status", warning and danger role="alert". Static notices have no
     * live role.
     */
    live?: boolean
  }) {
  const tone: AlertVariant = variant ?? "info"
  const Icon = ICONS[tone]
  const role = live
    ? tone === "warning" || tone === "danger"
      ? "alert"
      : "status"
    : undefined
  return (
    <div
      data-slot="alert"
      data-variant={tone}
      role={role}
      className={cn(alertVariants({ variant: tone }), className)}
      {...props}
    >
      <Icon aria-hidden weight="regular" />
      {children}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 type-ui text-text", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 type-body-sm text-text [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:decoration-2 [&_p:not(:last-child)]:mb-3",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants }
