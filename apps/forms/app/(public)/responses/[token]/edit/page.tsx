import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { Container } from "@ppitsz/ui/components/container"
import { editAction } from "@/lib/actions/respond"
import { effectiveSettings, isFileAnswer } from "@/lib/domain/form"
import { paths } from "@/lib/form-copy"
import { loadByToken, SECRET_PAGE_METADATA } from "@/lib/server/response-page"
import { responderMayEdit } from "@/lib/store"
import { FormHeader } from "@/components/form-header"
import { ResponseForm } from "@/components/response-form"

export const metadata: Metadata = { title: "Edit your answers", ...SECRET_PAGE_METADATA }

/** The responder's edit, until the form closes. The email and the ticket type stay as they are. */
export default async function EditResponsePage({ params }: PageProps<"/responses/[token]/edit">) {
  await connection()
  const { token } = await params
  const { form, response } = await loadByToken(token)
  if (!responderMayEdit(form, response, new Date())) redirect(paths.response(token, form.tickets.enabled))

  const settings = effectiveSettings(form.settings, form.tickets)
  const values: Record<string, string | string[]> = {}
  const files: Record<string, string> = {}
  for (const [id, answer] of Object.entries(response.answers)) {
    if (isFileAnswer(answer)) files[id] = answer.name
    else values[id] = answer
  }

  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      <FormHeader form={form} kicker="Edit your answers" description={false} />
      <ResponseForm
        mode="edit"
        action={editAction.bind(null, token)}
        sections={form.sections}
        line={form.line}
        ask={{ email: settings.collectEmail, contact: settings.collectContact }}
        ticketTypes={null}
        initial={{ identity: response.identity, values, files }}
        submitLabel="Save changes"
      />
    </Container>
  )
}
