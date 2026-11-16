import type { Metadata } from "next"
import { connection } from "next/server"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { toDraft } from "@/lib/domain/definition"
import { requireAdmin, requireFormAccess } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { Builder } from "@/components/staff/builder"

export const metadata: Metadata = { title: "Edit form" }

export default async function EditFormPage({ params }: PageProps<"/staff/[formId]/edit">) {
  await connection()
  await requireAdmin()
  const { form } = await requireFormAccess((await params).formId)

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {form.counts.total > 0 && (
        <Alert variant="warning">
          <AlertTitle>This form already has responses</AlertTitle>
          <AlertDescription>
            Editing questions doesn't change answers already in. A ticket type in use can't be deleted,
            and a quota can't go below the tickets taken.
          </AlertDescription>
        </Alert>
      )}
      <Builder formId={form.id} initial={toDraft(form)} origin={await siteOrigin()} />
    </div>
  )
}
