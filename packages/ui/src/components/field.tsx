"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { WarningCircleIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import { Label } from "@ppitsz/ui/components/label"
import { Separator } from "@ppitsz/ui/components/separator"

/*
 * Form anatomy: label → optional "(optional)" → control → helper → error.
 * Mark optional fields, not required ones. Labels are always visible.
 * Point the control's aria-describedby at the helper and error ids that exist.
 */

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-2 has-[>[data-slot=radio-group]]:gap-2",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1 text-text data-[variant=label]:type-ui data-[variant=legend]:type-heading-sm",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-6 data-[slot=checkbox-group]:gap-2 *:data-[slot=field-group]:gap-4",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva("group/field flex w-full gap-2", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "min-h-11 flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0.5",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0.5",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  optional,
  children,
  ...props
}: React.ComponentProps<typeof Label> & {
  /** true renders "(optional)"; a string overrides it. */
  optional?: boolean | string
}) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit flex-wrap gap-x-1.5 gap-y-0 group-data-[disabled=true]/field:text-subtle",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-border-strong",
        "has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-surface-strong has-data-checked:border-accent has-data-checked:bg-accent-subtle *:data-[slot=field]:p-3",
        className
      )}
      {...props}
    >
      {children}
      {optional && (
        <span className="type-body-sm text-muted">
          {typeof optional === "string" ? optional : "(optional)"}
        </span>
      )}
    </Label>
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 type-ui text-text group-data-[disabled=true]/field:text-subtle",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-left type-caption text-muted group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1",
        "[&>a]:text-accent-text [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:decoration-2",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn("relative -my-2 h-5 type-caption", className)}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-bg px-2 text-muted"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

/** Says how to fix the problem: "Enter your 9-digit student ID without spaces." */
function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("flex gap-1.5 type-caption text-danger-text", className)}
      {...props}
    >
      <WarningCircleIcon
        weight="bold"
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
      />
      <div>{content}</div>
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
