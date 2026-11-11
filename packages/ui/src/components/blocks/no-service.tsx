"use client"

import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"
import { useOnline } from "@ppitsz/ui/hooks/use-online"
import type { LineCode } from "@ppitsz/ui/lib/network"

/**
 * "No service": a service notice that shows only while the phone is offline,
 * on screens that need the network to work, such as a scanner. `children`
 * say what to do meanwhile.
 */
function NoService({
  title = "This phone is offline",
  lines,
  children,
  className,
}: {
  title?: string
  lines?: readonly LineCode[]
  children: React.ReactNode
  className?: string
}) {
  if (useOnline()) return null
  return (
    <ServiceNotice kind="suspended" label="No service" title={title} lines={lines} className={className}>
      {children}
    </ServiceNotice>
  )
}

export { NoService }
