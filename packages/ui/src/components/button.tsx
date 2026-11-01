import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@ppitsz/ui/lib/utils"
import { Spinner } from "@ppitsz/ui/components/spinner"

/**
 * Button. A capsule. `primary` is the one red action per screen, so the
 * default variant is `secondary`: red must always be asked for explicitly.
 */
const buttonBase = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-transparent type-ui whitespace-nowrap select-none",
    "transition-colors duration-(--duration-fast) ease-out",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-surface disabled:text-subtle",
    "aria-busy:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "border-text bg-transparent text-text hover:bg-surface-strong aria-expanded:bg-surface-strong",
        quiet:
          "bg-transparent text-text hover:bg-surface-strong aria-expanded:bg-surface-strong",
        danger:
          "border-danger bg-danger-subtle text-danger-text hover:bg-surface-strong",
      },
      size: {
        sm: "h-9 gap-1.5 px-4 [&_svg:not([class*='size-'])]:size-4",
        md: "h-11 px-5",
        lg: "h-14 px-7",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
)

/**
 * The button's classes, for links that look like buttons. Merged, so the
 * variant's border wins over the base's transparent one, as in <Button>.
 */
function buttonVariants(...args: Parameters<typeof buttonBase>) {
  return cn(buttonBase(...args))
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonBase> & {
    /**
     * Shows a spinner and sets aria-busy. Swap the label yourself
     * ("Send" → "Sending…"). Presses are ignored and focus stays put.
     */
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? "secondary"}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants, type ButtonProps }
