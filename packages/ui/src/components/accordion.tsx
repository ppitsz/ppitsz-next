import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { CaretDownIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"

/**
 * FAQ accordion: rows separated by hairlines, the question in
 * type-heading-md with a rotating CaretDown, the answer in muted body text at
 * most 66ch wide. Height animates over 200ms where supported.
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex min-h-11 flex-1 items-start justify-between gap-4 py-5 text-left type-heading-md text-text underline-offset-4 hover:underline aria-disabled:pointer-events-none aria-disabled:text-subtle",
          className
        )}
        {...props}
      >
        {children}
        <CaretDownIcon
          aria-hidden
          data-slot="accordion-trigger-icon"
          className="pointer-events-none mt-0.5 size-6 shrink-0 text-muted transition-transform duration-(--duration-base) ease-out group-aria-expanded/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-(--duration-base) ease-out data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div
        className={cn(
          "max-w-[66ch] pb-6 type-body text-muted [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:decoration-2 [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
