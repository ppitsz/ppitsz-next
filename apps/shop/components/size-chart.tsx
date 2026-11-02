"use client"

import { RulerIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
import type { CatalogSizeChart } from "@/lib/catalog"

/** "Size chart": opens a product's measurement table and size chart image over the page. */
export function SizeChartButton({ chart, productName }: { chart: CatalogSizeChart; productName: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="quiet" size="sm" className="self-start" />}>
        <RulerIcon aria-hidden />
        Size chart
        <span className="sr-only"> {productName}</span>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Size chart: {productName}</DialogTitle>
          {chart.measures.length > 0 && <DialogDescription>All measurements in cm.</DialogDescription>}
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6">
          {chart.measures.length > 0 && <SizeChartTable chart={chart} productName={productName} />}
          {chart.note && <p className="max-w-[66ch] type-body-sm text-text">{chart.note}</p>}
          {chart.imageUrl && (
            <a href={chart.imageUrl} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by /media, already sized */}
              <img
                src={chart.imageUrl}
                alt={`Size chart image for ${productName}`}
                className="max-h-[70dvh] w-full rounded-xl bg-surface object-contain"
              />
              <span className="mt-2 block type-caption text-muted">Tap to open full size</span>
            </a>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

/** One row per size, one column per measure. Scrolls sideways inside itself on a narrow phone. */
export function SizeChartTable({ chart, productName }: { chart: CatalogSizeChart; productName: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Sizes of {productName} in cm</caption>
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className="py-2 pe-6 align-bottom type-sign text-muted">
              Size
            </th>
            {chart.measures.map((measure) => (
              <th key={measure} scope="col" className="py-2 pe-6 align-bottom type-sign text-muted">
                {measure}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row, i) => (
            <tr key={i} className="border-b">
              <th scope="row" className="py-2 pe-6 type-ui text-text">
                {row.label || productName}
              </th>
              {row.values.map((value, j) => (
                <td key={j} className="py-2 pe-6 type-body-sm text-text">
                  {value || <span className="text-muted">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
