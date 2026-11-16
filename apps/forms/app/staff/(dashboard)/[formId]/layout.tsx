import { Container } from "@ppitsz/ui/components/container"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { formPhase } from "@/lib/domain/form"
import { PHASE_BADGE } from "@/lib/labels"
import { requireFormAccess } from "@/lib/server/auth"
import { FormTabs } from "@/components/staff/form-tabs"

/** One form's dashboard: its title and status above the tabs. Each page checks access itself too. */
export default async function FormLayout({ params, children }: LayoutProps<"/staff/[formId]">) {
  const { formId } = await params
  const { staff, form } = await requireFormAccess(formId)
  const base = `/staff/${form.id}`
  const fresh = Math.max(0, form.counts.total - (form.seen[staff.uid] ?? 0))
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/responses`, label: fresh > 0 ? `Responses (${fresh} new)` : "Responses" },
    { href: `${base}/results`, label: "Results" },
    ...(form.tickets.enabled
      ? [
          { href: `${base}/scan`, label: "Scan" },
          { href: `${base}/check-in`, label: "Check-in" },
          { href: `${base}/announcements`, label: "Announcements" },
        ]
      : []),
    ...(staff.isAdmin
      ? [
          { href: `${base}/edit`, label: "Edit form" },
          { href: `${base}/organizers`, label: "Organizers" },
        ]
      : []),
  ]

  return (
    <Container className="flex flex-col gap-8 py-8 lg:py-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <LineBadge code={form.line} />
          <StatusBadge domain="form" value={form.cancelledAt ? "cancelled" : PHASE_BADGE[formPhase(form, new Date())]} />
        </div>
        <h1 className="type-display-lg text-text">{form.title}</h1>
        <FormTabs links={links} />
      </div>
      {children}
    </Container>
  )
}
