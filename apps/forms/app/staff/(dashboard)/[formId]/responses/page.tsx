import type { Metadata } from "next"
import NextLink from "next/link"
import { after, connection } from "next/server"

import { Badge } from "@ppitsz/ui/components/badge"
import { Button } from "@ppitsz/ui/components/button"
import { Input } from "@ppitsz/ui/components/input"
import { Label } from "@ppitsz/ui/components/label"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formatDate, formatNumber, formatTime } from "@ppitsz/ui/lib/format"
import { effectiveSettings } from "@/lib/domain/form"
import type { FormResponse } from "@/lib/domain/types"
import { MAIL_LABELS, MAIL_PROBLEMS } from "@/lib/labels"
import { requireFormAccess } from "@/lib/server/auth"
import { listResponses, markSeen } from "@/lib/store"

export const metadata: Metadata = { title: "Responses" }

const PAGE = 200

/** Every response, newest first, with a search and filters. Opening it clears the "new" count. */
export default async function ResponsesPage({ params, searchParams }: PageProps<"/staff/[formId]/responses">) {
  await connection()
  const { staff, form } = await requireFormAccess((await params).formId)
  const { q = "", status = "live", type = "", email = "" } = (await searchParams) as Record<string, string | undefined>
  const all = await listResponses(form.id)
  const seenBefore = form.seen[staff.uid] ?? 0
  after(() => markSeen(form.id, staff.uid, form.counts.total))

  // Responses are numbered in order of arrival; the newest `fresh` are new to this person.
  const fresh = new Set(
    [...all]
      .sort((a, b) => +a.createdAt - +b.createdAt)
      .slice(seenBefore)
      .map((r) => r.id)
  )
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!type || r.ticketTypeId === type) &&
      (!email || (r.mail && MAIL_PROBLEMS.includes(r.mail.status))) &&
      (!needle || [r.identity.name, r.identity.email, r.code, r.identity.wechatId].some((v) => v.toLowerCase().includes(needle)))
  )
  const settings = effectiveSettings(form.settings, form.tickets)
  const typeName = new Map(form.tickets.types.map((t) => [t.id, t.name]))
  const days = form.tickets.days
  const problems = all.filter((r) => r.status === "live" && r.mail && MAIL_PROBLEMS.includes(r.mail.status)).length

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" name="q" defaultValue={q} placeholder="Name, email, code or WeChat" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={status}>
            <NativeSelectOption value="live">Live</NativeSelectOption>
            <NativeSelectOption value="cancelled">Canceled</NativeSelectOption>
            <NativeSelectOption value="all">All</NativeSelectOption>
          </NativeSelect>
        </div>
        {form.tickets.enabled && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Ticket type</Label>
            <NativeSelect id="type" name="type" defaultValue={type}>
              <NativeSelectOption value="">All types</NativeSelectOption>
              {form.tickets.types.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
        {settings.collectEmail && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <NativeSelect id="email" name="email" defaultValue={email}>
              <NativeSelectOption value="">All</NativeSelectOption>
              <NativeSelectOption value="masalah">Bermasalah ({problems})</NativeSelectOption>
            </NativeSelect>
          </div>
        )}
        <Button type="submit">Apply</Button>
      </form>

      <p className="type-body-sm text-muted">
        {formatNumber(shown.length)} of {formatNumber(all.length)} {all.length === 1 ? "response" : "responses"}
        {shown.length > PAGE && `, the ${PAGE} latest shown; download the CSV for all of them`}.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                {settings.collectEmail ? "Name" : "Response"}
              </th>
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                Code
              </th>
              {form.tickets.enabled && (
                <th scope="col" className="py-2 pe-4 type-sign text-muted">
                  Type
                </th>
              )}
              <th scope="col" className="py-2 pe-4 type-sign text-muted">
                Sent
              </th>
              {form.tickets.enabled && (
                <th scope="col" className="py-2 pe-4 type-sign text-muted">
                  Check-in
                </th>
              )}
              <th scope="col" className="py-2 type-sign text-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, PAGE).map((r) => (
              <tr key={r.id} className="border-b align-top">
                <th scope="row" className="py-2 pe-4 type-body-sm text-text">
                  <NextLink href={`/staff/${form.id}/responses/${r.id}`} className="type-ui underline-offset-4 hover:underline">
                    {r.identity.name || `Response ${r.code}`}
                  </NextLink>
                  {r.identity.email && <span className="block type-caption text-muted">{r.identity.email}</span>}
                </th>
                <td className="py-2 pe-4 type-sign text-text">{r.code}</td>
                {form.tickets.enabled && (
                  <td className="py-2 pe-4 type-body-sm text-text">{typeName.get(r.ticketTypeId ?? "") ?? ""}</td>
                )}
                <td className="py-2 pe-4 type-body-sm text-text">
                  {formatDate(r.createdAt)}, {formatTime(r.createdAt)}
                </td>
                {form.tickets.enabled && (
                  <td className="py-2 pe-4 type-body-sm text-text">
                    {days.filter((d) => r.checkIns[d.id]).length}/{days.length}
                  </td>
                )}
                <td className="py-2">
                  <StatusCell response={r} fresh={fresh.has(r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusCell({ response: r, fresh }: { response: FormResponse; fresh: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {r.status === "cancelled" && <StatusBadge domain="form" value="cancelled" />}
      {Object.keys(r.checkIns).length > 0 && r.status === "live" && <StatusBadge domain="form" value="attended" />}
      {r.mail && MAIL_PROBLEMS.includes(r.mail.status) && <Badge variant="warning">{MAIL_LABELS[r.mail.status]}</Badge>}
      {r.source === "door" && <Badge variant="outline">Walk-in</Badge>}
      {fresh && <Badge variant="highlight">New</Badge>}
    </span>
  )
}
