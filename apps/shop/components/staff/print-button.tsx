"use client"

import { PrinterIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"

/** Opens the browser's print dialog; save as PDF works too. */
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <PrinterIcon aria-hidden />
      Print or save as PDF
    </Button>
  )
}
