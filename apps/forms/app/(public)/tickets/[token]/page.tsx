import type { Metadata } from "next"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { CalendarBlankIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { allQuestions } from "@/lib/domain/form"
import { canSelfCancel } from "@/lib/domain/tickets"
import { paths } from "@/lib/form-copy"
import { MAIL_PROBLEMS } from "@/lib/labels"
import { loadByToken, SECRET_PAGE_METADATA } from "@/lib/server/response-page"
import { ticketUrl } from "@/lib/server/notify"
import { siteOrigin } from "@/lib/server/site-url"
import { responderMayEdit } from "@/lib/store"
import { AnswerList } from "@/components/answer-list"
import { FormHeader } from "@/components/form-header"
import { CancelOwnButton, ResendButton } from "@/components/response-actions"
import { TicketCard } from "@/components/ticket-card"

export const metadata: Metadata = { title: "Ticket", ...SECRET_PAGE_METADATA }

/** The ticket itself: the email is only a copy of this page. */
export default async function TicketPage({ params, searchParams }: PageProps<"/tickets/[token]">) {
  await connection()
  const { token } = await params
  const { new: isNew, edited } = await searchParams
  const { form, response } = await loadByToken(token)
  if (!form.tickets.enabled) redirect(paths.response(token, false))

  const now = new Date()
  const live = response.status === "live" && !form.cancelledAt
  const editable = responderMayEdit(form, response, now) && allQuestions(form).length > 0
  const mailProblem = response.mail && MAIL_PROBLEMS.includes(response.mail.status)

  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      <FormHeader form={form} kicker={live ? "Your ticket" : "Ticket not valid"} description={false} />

      {isNew === "1" && live && (
        <Alert variant="success" live>
          <AlertTitle>You're signed up</AlertTitle>
          <AlertDescription>
            This is your ticket. A copy was sent to {response.identity.email}; if it doesn't arrive, check your spam folder. Save
            this page's link or take a screenshot of the QR code.
          </AlertDescription>
        </Alert>
      )}
      {edited === "1" && (
        <Alert variant="success" live>
          <AlertTitle>Your answers are saved</AlertTitle>
        </Alert>
      )}
      {mailProblem && live && (
        <Alert variant="warning">
          <AlertTitle>The ticket email didn't arrive</AlertTitle>
          <AlertDescription>
            The email to {response.identity.email} bounced. If the address is wrong, ask us to fix it. The ticket on
            this page is still valid.
          </AlertDescription>
        </Alert>
      )}

      <TicketCard form={form} response={response} url={ticketUrl(await siteOrigin(), token)} dispense={isNew === "1"} />

      {live && (
        <div className="flex flex-wrap gap-3">
          <a href={paths.calendar(token)} className={buttonVariants()}>
            <CalendarBlankIcon aria-hidden />
            Add to calendar
          </a>
          {response.identity.email && <ResendButton token={token} />}
          {editable && (
            <NextLink href={paths.edit(token)} className={buttonVariants({ variant: "quiet" })}>
              Edit your answers
            </NextLink>
          )}
          {canSelfCancel(form, response, now) && <CancelOwnButton token={token} ticket />}
        </div>
      )}

      {allQuestions(form).length > 0 && (
        <section aria-labelledby="answers" className="flex flex-col gap-4">
          <h2 id="answers" className="type-heading-md text-text">
            Your answers
          </h2>
          <AnswerList sections={form.sections} answers={response.answers} />
        </section>
      )}
    </Container>
  )
}
