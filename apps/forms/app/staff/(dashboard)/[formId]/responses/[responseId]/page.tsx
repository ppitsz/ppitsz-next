import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Link } from "@ppitsz/ui/components/link"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatTime } from "@ppitsz/ui/lib/format"
import { effectiveSettings } from "@/lib/domain/form"
import { campusName } from "@/lib/domain/results"
import { daysOf } from "@/lib/domain/tickets"
import { dayLabel, paths, sortedDays, when } from "@/lib/form-copy"
import { MAIL_LABELS, MAIL_PROBLEMS } from "@/lib/labels"
import { requireFormAccess } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { getResponse } from "@/lib/store"
import { AnswerList } from "@/components/answer-list"
import { CopyLinkButton } from "@/components/staff/form-admin"
import { CancelResponseButton, CheckInButton, EditResponseForm, ResendEmailButton } from "@/components/staff/response-admin"

export const metadata: Metadata = { title: "Response", referrer: "no-referrer" }

const CANCELLED_BY = { self: "by its holder", organizer: "by an organizer", event: "because the event was canceled" } as const

export default async function ResponsePage({ params }: PageProps<"/staff/[formId]/responses/[responseId]">) {
  await connection()
  const { formId, responseId } = await params
  const { form } = await requireFormAccess(formId)
  const response = await getResponse(responseId)
  if (!response || response.formId !== form.id) notFound()

  const settings = effectiveSettings(form.settings, form.tickets)
  const live = response.status === "live"
  const link = `${await siteOrigin()}${paths.response(response.token, form.tickets.enabled)}`
  const type = form.tickets.types.find((t) => t.id === response.ticketTypeId)
  const mailProblem = response.mail && MAIL_PROBLEMS.includes(response.mail.status)
  const typeDays = new Set(daysOf(form, response.ticketTypeId).map((d) => d.id))

  return (
    <div className="flex flex-col gap-10">
      <Link as={NextLink} href={`/staff/${form.id}/responses`} variant="standalone">
        All responses
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!live && <StatusBadge domain="form" value="cancelled" />}
          {type && <span className="type-sign text-muted">{type.name}</span>}
          <span className="type-sign text-muted">Code {response.code}</span>
        </div>
        <h2 className="type-heading-lg text-text">{response.identity.name || `Response ${response.code}`}</h2>
        <p className="type-body-sm text-muted">
          {response.source === "door" ? "Walk-in sign-up" : "Sent"} {formatDate(response.createdAt)},{" "}
          {formatTime(response.createdAt)}
          {response.identity.email && ` · ${response.identity.email}`}
          {response.identity.wechatId && ` · WeChat ${response.identity.wechatId}`}
          {response.identity.campus && ` · ${campusName(response.identity.campus)}`}
        </p>
        {!live && response.cancelledAt && (
          <p className="type-body-sm text-text">
            Canceled {when(response.cancelledAt)} {response.cancelledBy && CANCELLED_BY[response.cancelledBy]}.
          </p>
        )}
      </div>

      {response.mail && (
        <Alert variant={mailProblem ? "warning" : "info"}>
          <AlertTitle>Email: {MAIL_LABELS[response.mail.status]}</AlertTitle>
          <AlertDescription>
            {when(response.mail.at)}
            {response.mail.detail && ` · ${response.mail.detail}`}
            {mailProblem && ". Fix the address below, then save: the ticket is sent again automatically."}
          </AlertDescription>
        </Alert>
      )}

      {live && (
        <section aria-labelledby="tautan" className="flex flex-col gap-3">
          <h3 id="tautan" className="type-heading-md text-text">
            {form.tickets.enabled ? "Ticket link" : "Answers link"}
          </h3>
          <p className="type-caption text-muted">
            Secret: send it only to its holder (on WeChat, say, if the email didn't arrive).
          </p>
          <div className="flex flex-wrap gap-3">
            <CopyLinkButton url={link} />
            {response.identity.email && <ResendEmailButton formId={form.id} responseId={response.id} />}
          </div>
        </section>
      )}

      {form.tickets.enabled && form.tickets.days.length > 0 && (
        <section aria-labelledby="check-in" className="flex flex-col gap-3">
          <h3 id="check-in" className="type-heading-md text-text">
            Check-in
          </h3>
          <ul className="flex flex-col">
            {sortedDays(form.tickets.days).map((day) => {
              const checkIn = response.checkIns[day.id]
              return (
                <li key={day.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
                  <span className="flex flex-col">
                    <span className="type-ui text-text">{dayLabel(day)}</span>
                    <span className="type-caption text-muted">
                      {!typeDays.has(day.id)
                        ? "This ticket type isn't valid on this day"
                        : checkIn
                          ? `Checked in ${formatTime(checkIn.at)} by ${checkIn.byName}`
                          : "Not checked in"}
                    </span>
                  </span>
                  {live && typeDays.has(day.id) && (
                    <CheckInButton formId={form.id} responseId={response.id} dayId={day.id} checkedIn={!!checkIn} />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="answers" className="flex flex-col gap-4">
        <h3 id="answers" className="type-heading-md text-text">
          Answers
        </h3>
        <AnswerList sections={form.sections} answers={response.answers} fileLinks />
      </section>

      {live && (settings.collectEmail || form.tickets.enabled) && (
        <section aria-labelledby="edit" className="flex flex-col gap-4 border-t pt-8">
          <h3 id="edit" className="type-heading-md text-text">
            Edit details
          </h3>
          <EditResponseForm
            formId={form.id}
            responseId={response.id}
            identity={response.identity}
            ask={{ email: settings.collectEmail, contact: settings.collectContact || response.source === "door" }}
            ticketTypeId={response.ticketTypeId}
            types={form.tickets.enabled ? form.tickets.types.map((t) => ({ id: t.id, name: t.name })) : null}
          />
        </section>
      )}

      {live && (
        <div className="border-t pt-8">
          <CancelResponseButton formId={form.id} responseId={response.id} ticket={form.tickets.enabled} />
        </div>
      )}
    </div>
  )
}
