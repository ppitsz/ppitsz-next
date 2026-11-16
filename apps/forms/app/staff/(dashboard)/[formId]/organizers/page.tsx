import type { Metadata } from "next"
import { connection } from "next/server"

import { requireAdmin, requireFormAccess } from "@/lib/server/auth"
import { AddMemberForm, RemoveMemberButton } from "@/components/staff/team-forms"

export const metadata: Metadata = { title: "Organizers" }

/** The form's organizers: they see its responses, scan its tickets and send announcements, until it ends. */
export default async function TeamPage({ params }: PageProps<"/staff/[formId]/organizers">) {
  await connection()
  await requireAdmin()
  const { form } = await requireFormAccess((await params).formId)

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section aria-labelledby="organizer-list" className="flex flex-col gap-4">
        <h2 id="organizer-list" className="type-heading-md text-text">
          This form's organizers
        </h2>
        <p className="max-w-[66ch] type-body-sm text-muted">
          Organizers can see responses and files, scan tickets, do walk-in sign-ups, and send announcements to ticket holders.
          Only admins can edit the form and its organizers. Access ends when the form has ended.
        </p>
        {form.team.length === 0 ? (
          <p className="type-body text-muted">No organizers yet.</p>
        ) : (
          <ul className="flex flex-col">
            {form.team.map((m) => (
              <li key={m.uid} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
                <span className="flex flex-col">
                  <span className="type-ui text-text">{m.name}</span>
                  <span className="type-caption text-muted">{m.email}</span>
                </span>
                <RemoveMemberButton formId={form.id} uid={m.uid} name={m.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="add" className="flex flex-col gap-4">
        <h2 id="add" className="type-heading-md text-text">
          Add organizer
        </h2>
        <AddMemberForm formId={form.id} />
      </section>
    </div>
  )
}
