import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { requestAccessAction, verifyAccessAction } from "@/lib/actions/respond"
import { effectiveSettings } from "@/lib/domain/form"
import { paths } from "@/lib/form-copy"
import { getFormBySlug } from "@/lib/store"
import { AccessForm } from "@/components/access-form"

export const metadata: Metadata = { title: "Find your response", robots: { index: false, follow: false } }

/** For someone who lost the email: their address, then a code sent to it. */
export default async function BackPage({ params }: PageProps<"/[slug]/find">) {
  await connection()
  const form = await getFormBySlug((await params).slug)
  if (!form || form.status === "draft" || !effectiveSettings(form.settings, form.tickets).collectEmail) notFound()

  return (
    <Container narrow className="flex flex-col gap-8 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">Lost property · {form.title}</p>
        <h1 className="type-display-xl text-text">{form.tickets.enabled ? "Find your ticket" : "Find your answers"}</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          Lost the email? Write the address you used to sign up. We&apos;ll send a code to open it here.
        </p>
      </div>
      <AccessForm
        request={requestAccessAction.bind(null, form.id)}
        verify={verifyAccessAction.bind(null, form.id)}
        ticket={form.tickets.enabled}
      />
      <Link as={NextLink} href={paths.form(form)} variant="standalone">
        Back to the form
      </Link>
    </Container>
  )
}
