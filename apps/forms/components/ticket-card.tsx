import QRCode from "qrcode"

import {
  Ticket,
  TicketBody,
  TicketCode,
  TicketField,
  TicketFields,
  TicketHeader,
  TicketStub,
  TicketTitle,
} from "@ppitsz/ui/components/blocks/ticket"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { formatTime } from "@ppitsz/ui/lib/format"
import { daysOf } from "@/lib/domain/tickets"
import type { Form, FormResponse } from "@/lib/domain/types"
import { dayLabel, sortedDays } from "@/lib/form-copy"
import { campusName } from "@/lib/domain/results"

/*
 * The ticket: a Jaringan Ticket on the organizing division's line. The body
 * says whose it is, its type, and the days it gets in on; with several days,
 * a route whose stations fill once that day's check-in is recorded. The stub
 * holds the QR, or says why the ticket isn't valid.
 */

/** Rendered on the server as inline SVG; always black on white, whatever the theme, for scanners. */
async function TicketQr({ url, code }: { url: string; code: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 3,
    color: { dark: "#000000", light: "#ffffff" },
  })
  return (
    <div
      role="img"
      aria-label={`Ticket QR code ${code}`}
      className="w-full max-w-72 overflow-hidden rounded-xl [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export async function TicketCard({
  form,
  response,
  url,
  dispense = false,
}: {
  form: Form
  response: FormResponse
  url: string
  /** Just signed up: the ticket comes out of the machine. */
  dispense?: boolean
}) {
  const type = form.tickets.types.find((t) => t.id === response.ticketTypeId)
  const days = sortedDays(daysOf(form, response.ticketTypeId))
  const live = response.status === "live" && !form.cancelledAt
  const anyCheckIn = Object.keys(response.checkIns).length > 0
  const oneDay = days.length === 1 ? days[0] : undefined
  const oneDayCheckIn = oneDay && response.checkIns[oneDay.id]

  return (
    <Ticket aria-labelledby="ticket-name" dispense={dispense && live}>
      <TicketBody line={form.line}>
        <TicketHeader>
          <LineBadge code={form.line} />
          <span className="type-sign text-muted">{type?.name ?? "Ticket"}</span>
        </TicketHeader>
        <TicketTitle id="ticket-name">{response.identity.name}</TicketTitle>
        {(oneDay || form.tickets.venue || response.identity.campus) && (
          <TicketFields>
            {oneDay && (
              <TicketField label="Date" className="col-span-2">
                {dayLabel(oneDay)}
              </TicketField>
            )}
            {form.tickets.venue && <TicketField label="Venue">{form.tickets.venue}</TicketField>}
            {response.identity.campus && (
              <TicketField label="Campus">{campusName(response.identity.campus)}</TicketField>
            )}
            {oneDay && (
              <TicketField label="Check-in">
                {oneDayCheckIn ? formatTime(oneDayCheckIn.at) : "Not yet"}
              </TicketField>
            )}
          </TicketFields>
        )}

        {days.length > 1 && (
          <RouteList orientation="vertical" aria-label="Days it covers">
            {days.map((day) => {
              const checkIn = response.checkIns[day.id]
              return (
                <RouteStop key={day.id} state={checkIn ? "passed" : "upcoming"}>
                  <span className="flex flex-col">
                    <span className="type-ui text-text">{dayLabel(day)}</span>
                    <span className="type-caption text-muted">
                      {checkIn ? `Checked in ${formatTime(checkIn.at)}` : "Not checked in"}
                    </span>
                  </span>
                </RouteStop>
              )
            })}
          </RouteList>
        )}
      </TicketBody>

      <TicketStub className={live ? undefined : "items-start"}>
        {live ? (
          <>
            <TicketQr url={url} code={response.code} />
            <TicketCode>{response.code}</TicketCode>
            {!anyCheckIn && (
              <p className="max-w-[44ch] text-center type-caption text-muted">
                Show this QR code at check-in. This page&apos;s link is secret: don&apos;t share it, whoever
                has it can use your ticket.
              </p>
            )}
          </>
        ) : (
          <p className="type-body text-text">
            {form.cancelledAt ? "This event was canceled, so this ticket isn't valid." : "This ticket has been canceled and isn't valid."}
          </p>
        )}
      </TicketStub>
    </Ticket>
  )
}
