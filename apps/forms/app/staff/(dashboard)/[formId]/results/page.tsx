import type { Metadata } from "next"
import { connection } from "next/server"

import { formatNumber } from "@ppitsz/ui/lib/format"
import { summarize, TEXT_SAMPLE, type QuestionSummary } from "@/lib/domain/results"
import { requireFormAccess } from "@/lib/server/auth"
import { listResponses } from "@/lib/store"

export const metadata: Metadata = { title: "Results" }

/**
 * A summary per question, from live responses. Choices are bars: one hue (the
 * form's line, drawn as a route), the count and share written beside each,
 * so the numbers never depend on the color.
 */
export default async function ResultsPage({ params }: PageProps<"/staff/[formId]/results">) {
  await connection()
  const { form } = await requireFormAccess((await params).formId)
  const responses = await listResponses(form.id)
  const summaries = summarize(form, responses)
  const live = responses.filter((r) => r.status === "live").length

  if (summaries.length === 0) {
    return <p className="type-body text-muted">This form has no questions yet.</p>
  }
  return (
    <div className="flex flex-col gap-10">
      <p className="type-body-sm text-muted">
        From {formatNumber(live)} live {live === 1 ? "response" : "responses"}. The full answers are in the CSV.
      </p>
      {summaries.map((s) => (
        <section key={s.question.id} aria-labelledby={`h-${s.question.id}`} className="flex flex-col gap-4 border-b pb-8">
          <div className="flex flex-col gap-1">
            <h2 id={`h-${s.question.id}`} className="type-heading-md text-text">
              {s.question.title}
            </h2>
            <p className="type-caption text-muted">{formatNumber(s.answered)} menjawab</p>
          </div>
          <Summary summary={s} line={form.line} />
        </section>
      ))}
    </div>
  )
}

function Summary({ summary: s, line }: { summary: QuestionSummary; line: string }) {
  if (s.kind === "file") return <p className="type-body text-text">{formatNumber(s.answered)} file diunggah.</p>
  if (s.kind === "text") {
    if (s.latest.length === 0) return <p className="type-body text-muted">No answers yet.</p>
    return (
      <>
        <ul className="flex flex-col gap-2">
          {s.latest.map((text, i) => (
            <li key={i} className="rounded-xl bg-surface px-4 py-3 type-body-sm whitespace-pre-line text-text">
              {text}
            </li>
          ))}
        </ul>
        {s.answered > TEXT_SAMPLE && (
          <p className="type-caption text-muted">The {TEXT_SAMPLE} latest answers. All of them are in the CSV.</p>
        )}
      </>
    )
  }
  const max = Math.max(1, ...s.options.map((o) => o.count))
  return (
    <ul className="flex flex-col gap-4" data-line={line}>
      {s.options.map((o) => {
        const share = s.answered ? Math.round((o.count / s.answered) * 100) : 0
        return (
          <li key={o.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="type-body-sm text-text">{o.label}</span>
              <span className="shrink-0 type-sign text-text">
                {formatNumber(o.count)} <span className="text-muted">· {share}%</span>
              </span>
            </div>
            <div aria-hidden className="h-1.5 w-full rounded-full bg-surface">
              {o.count > 0 && <span className="route" style={{ width: `${(o.count / max) * 100}%` }} />}
            </div>
          </li>
        )
      })}
      {s.question.type === "multi" && (
        <li className="type-caption text-muted">People can pick more than one, so the percentages can add up to more than 100%.</li>
      )}
    </ul>
  )
}
