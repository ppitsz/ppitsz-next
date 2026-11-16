import { answerText, isFileAnswer, visibleQuestions } from "@/lib/domain/form"
import type { Answers, Section } from "@/lib/domain/types"
import { paths } from "@/lib/form-copy"

/**
 * A response's answers, question by question, as the responder saw them.
 * `fileLinks` (staff only) links file answers to /staff/files.
 */
export function AnswerList({
  sections,
  answers,
  fileLinks = false,
}: {
  sections: Section[]
  answers: Answers
  fileLinks?: boolean
}) {
  const shown = visibleQuestions(sections, answers).flatMap(({ questions }) => questions)
  if (shown.length === 0) return null
  return (
    <dl className="flex flex-col gap-4">
      {shown.map((q) => {
        const answer = answers[q.id]
        return (
          <div key={q.id} className="flex flex-col gap-1 border-b pb-4">
            <dt className="type-caption text-muted">{q.title}</dt>
            <dd className="type-body whitespace-pre-line text-text">
              {answer === undefined ? (
                <span className="text-muted">Not answered</span>
              ) : fileLinks && isFileAnswer(answer) ? (
                <a href={paths.upload(answer.path)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                  {answer.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                answerText(q, answer)
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
