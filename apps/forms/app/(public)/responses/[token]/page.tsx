import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { formatDate, formatTime } from "@ppitsz/ui/lib/format"
import { canSelfCancel } from "@/lib/domain/tickets"
import { paths } from "@/lib/form-copy"
import { loadByToken, SECRET_PAGE_METADATA } from "@/lib/server/response-page"
import { responderMayEdit } from "@/lib/store"
import { AnswerList } from "@/components/answer-list"
import { FormHeader } from "@/components/form-header"
import { CancelOwnButton, ResendButton } from "@/components/response-actions"

export const metadata: Metadata = { title: "Your answers", ...SECRET_PAGE_METADATA }

/** A plain form's response: what was sent, and the way to change it while the form is open. */
export default async function ResponsePage({ params, searchParams }: PageProps<"/responses/[token]">) {
  await connection()
  const { token } = await params
  const { new: isNew, edited } = await searchParams
  const { form, response } = await loadByToken(token)
  if (form.tickets.enabled) redirect(paths.response(token, true))

  const now = new Date()
  const live = response.status === "live"
  const anonymous = !response.identity.email

  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      <FormHeader form={form} kicker={live ? "Your answers were sent" : "Answers withdrawn"} description={false} />

      {isNew === "1" && (
        <Alert variant="success" live>
          <AlertTitle>Thank you</AlertTitle>
          <AlertDescription>
            {anonymous
              ? "We've received your answers. Save this page's link if you want to see them again: this form doesn't ask for an email."
              : `We've received your answers. A link to this page was sent to ${response.identity.email}.`}
          </AlertDescription>
        </Alert>
      )}
      {edited === "1" && (
        <Alert variant="success" live>
          <AlertTitle>Your changes are saved</AlertTitle>
        </Alert>
      )}

      <p className="type-body-sm text-muted">
        Sent {formatDate(response.createdAt)}, {formatTime(response.createdAt)}
        {+response.updatedAt !== +response.createdAt &&
          ` · edited ${formatDate(response.updatedAt)}, ${formatTime(response.updatedAt)}`}
      </p>

      <AnswerList sections={form.sections} answers={response.answers} />

      {live && (
        <div className="flex flex-wrap gap-3">
          {responderMayEdit(form, response, now) && (
            <NextLink href={paths.edit(token)} className={buttonVariants({ variant: "primary" })}>
              Edit your answers
            </NextLink>
          )}
          {!anonymous && <ResendButton token={token} />}
          {canSelfCancel(form, response, now) && <CancelOwnButton token={token} ticket={false} />}
        </div>
      )}
    </Container>
  )
}
