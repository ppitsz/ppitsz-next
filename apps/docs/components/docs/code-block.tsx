import { codeToHtml } from "shiki"

import { cn } from "@ppitsz/ui/lib/utils"

/** Server-rendered, highlighted code in both themes. */
export async function CodeBlock({
  code,
  lang = "tsx",
  className,
}: {
  code: string
  lang?: "tsx" | "css" | "bash" | "json" | "ts"
  className?: string
}) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  })
  return (
    <div
      className={cn("docs-code overflow-x-auto rounded-xl bg-surface p-4 sm:p-5", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
