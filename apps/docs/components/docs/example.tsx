import * as React from "react"

import { CodeBlock } from "@/components/docs/code-block"
import { PreviewFrame } from "@/components/docs/preview-frame"

/** A live preview with its source underneath, behind a disclosure. */
export function Example({
  children,
  code,
  title,
  description,
  lang,
  layout,
  defaultMode,
  frameClassName,
}: {
  children: React.ReactNode
  code?: string
  title?: string
  description?: React.ReactNode
  lang?: string
  layout?: "row" | "stack" | "block"
  defaultMode?: "page" | "light" | "dark" | "ink"
  frameClassName?: string
}) {
  return (
    <figure className="flex flex-col gap-3">
      {(title || description) && (
        <figcaption className="flex flex-col gap-1">
          {title && <span className="type-heading-sm text-text">{title}</span>}
          {description && (
            <span className="max-w-[66ch] type-body-sm text-muted">{description}</span>
          )}
        </figcaption>
      )}
      <PreviewFrame
        lang={lang}
        layout={layout}
        defaultMode={defaultMode}
        className={frameClassName}
      >
        {children}
      </PreviewFrame>
      {code && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer items-center type-ui text-text underline-offset-4 hover:underline">
            <span className="group-open:hidden">Show code</span>
            <span className="hidden group-open:inline">Hide code</span>
          </summary>
          <CodeBlock code={code} />
        </details>
      )}
    </figure>
  )
}
