import * as React from "react"

import { Badge } from "@ppitsz/ui/components/badge"
import {
  STATUSES,
  type StatusDomain,
  type StatusValue,
} from "@ppitsz/ui/lib/network"

/**
 * Status badge from the shared status table: the words, the tone and
 * the leading dot all come from one place. Neutral tones carry no dot.
 */
function StatusBadge<D extends StatusDomain>({
  domain,
  value,
  suffix,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> & {
  domain: D
  value: StatusValue<D>
  /** Appended after a middle dot: "Accepted · HUMAS". */
  suffix?: React.ReactNode
}) {
  const status = (STATUSES[domain] as Record<string, { label: string; tone: string }>)[
    value as string
  ]!
  const tone = status.tone as React.ComponentProps<typeof Badge>["variant"]
  return (
    <Badge
      variant={tone}
      dot={tone !== "neutral" && tone !== "outline" && tone !== "highlight"}
      data-status={String(value)}
      {...props}
    >
      {status.label}
      {suffix && <> · {suffix}</>}
    </Badge>
  )
}

export { StatusBadge }
