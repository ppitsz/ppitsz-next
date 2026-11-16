import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"
import { DownloadSimpleIcon, PrinterIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { formatNumber } from "@ppitsz/ui/lib/format"
import { effectiveSettings } from "@/lib/domain/form"
import { placesLeft, typeAvailability } from "@/lib/domain/tickets"
import { paths, when } from "@/lib/form-copy"
import { requireFormAccess } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { CopyFormButton, CopyLinkButton, CoverForm, StatusControl } from "@/components/staff/form-admin"

export const metadata: Metadata = { title: "Overview" }

export default async function FormOverviewPage({ params }: PageProps<"/staff/[formId]">) {
  await connection()
  const { staff, form } = await requireFormAccess((await params).formId)
  const now = new Date()
  const url = `${await siteOrigin()}${paths.form(form)}`
  const settings = effectiveSettings(form.settings, form.tickets)
  const left = placesLeft(form)
  const fresh = Math.max(0, form.counts.total - (form.seen[staff.uid] ?? 0))

  return (
    <div className="flex flex-col gap-10">
      {form.cancelledAt && (
        <Alert variant="danger">
          <AlertTitle>Event canceled {when(form.cancelledAt)}</AlertTitle>
          <AlertDescription>Every ticket has stopped working, and their holders have been told.</AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile term="Responses" value={formatNumber(form.counts.live)} note={`${formatNumber(form.counts.total - form.counts.live)} canceled`} />
        <Tile term="New for you" value={formatNumber(fresh)} note="Since you last opened Responses" />
        <Tile term="Places left" value={left === null ? "No limit" : formatNumber(left)} note={form.tickets.enabled ? "All ticket types" : "Response limit"} />
        <Tile
          term="Closes"
          value={form.closesAt ? when(form.closesAt) : "Not set"}
          note={form.opensAt ? `Opens ${when(form.opensAt)}` : "By status"}
        />
      </dl>

      <section aria-labelledby="tautan" className="flex flex-col gap-3">
        <h2 id="tautan" className="type-heading-md text-text">
          Form link
        </h2>
        <p className="type-body break-all text-text">{url}</p>
        <div className="flex flex-wrap gap-3">
          <CopyLinkButton url={url} />
          <NextLink href={paths.form(form)} target="_blank" className={buttonVariants({ size: "sm", variant: "quiet" })}>
            {form.status === "draft" ? "Preview" : "Open form"}
            <span className="sr-only"> (opens in a new tab)</span>
          </NextLink>
        </div>
        <p className="type-caption text-muted">
          {form.unlisted ? "Hidden from the home page: only people with the link can open it." : "Shown on the home page while it's open."}{" "}
          {settings.collectEmail ? "Collects names and emails." : "Anonymous: no names or emails."}
        </p>
      </section>

      {form.tickets.enabled && (
        <section aria-labelledby="jenis" className="flex flex-col gap-3">
          <h2 id="jenis" className="type-heading-md text-text">
            Ticket type
          </h2>
          <ul className="flex flex-col">
            {form.tickets.types.map((type) => {
              const taken = form.counts.byType[type.id] ?? 0
              const { state } = typeAvailability(form, type, now)
              return (
                <li key={type.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b py-3">
                  <span className="type-ui text-text">{type.name}</span>
                  <span className="type-body-sm text-muted">
                    {formatNumber(taken)}
                    {type.quota !== null && ` of ${formatNumber(type.quota)}`} taken
                    {state === "not_yet" && " · not on sale yet"}
                    {state === "ended" && " · sales ended"}
                    {state === "sold_out" && " · sold out"}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="download" className="flex flex-col gap-3">
        <h2 id="download" className="type-heading-md text-text">
          Data
        </h2>
        <div className="flex flex-wrap gap-3">
          <a href={`/staff/export/${form.id}`} className={buttonVariants()}>
            <DownloadSimpleIcon aria-hidden />
            Download CSV
          </a>
          {form.tickets.enabled && (
            <NextLink href={`/staff/print/${form.id}`} className={buttonVariants()}>
              <PrinterIcon aria-hidden />
              Printable check-in list
            </NextLink>
          )}
        </div>
        <p className="type-caption text-muted">
          90 days after the form ends, emails, WeChat IDs, files and text answers are deleted. Names, campuses, ticket types,
          check-ins and choice answers stay for the recap.
        </p>
      </section>

      {staff.isAdmin && (
        <section aria-labelledby="settings" className="flex flex-col gap-6 border-t pt-8">
          <h2 id="settings" className="type-heading-md text-text">
            Settings
          </h2>
          <StatusControl formId={form.id} status={form.status} />
          <CoverForm formId={form.id} hasCover={!!form.coverPath} />
          <div className="flex flex-col gap-2">
            <CopyFormButton formId={form.id} />
            <p className="type-caption text-muted">
              Makes a new draft with the same sections, questions, ticket types and organizers, without responses.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

function Tile({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-5">
      <dt className="type-caption text-muted">{term}</dt>
      <dd className="type-heading-lg text-text">{value}</dd>
      <dd className="type-caption text-muted">{note}</dd>
    </div>
  )
}
