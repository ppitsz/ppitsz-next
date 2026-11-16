import type { Metadata } from "next"
import NextLink from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { MagnifyingGlassIcon, MapPinIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { ServiceNotice } from "@ppitsz/ui/components/blocks/service-notice"
import { Timetable } from "@ppitsz/ui/components/blocks/timetable"
import { Sign, SignBoard, SignPictogram } from "@ppitsz/ui/components/network/sign"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { getProfile } from "@ppitsz/accounts/profile"
import { getSession } from "@ppitsz/accounts/session"
import { signInUrl } from "@ppitsz/accounts/urls"
import { submitAction } from "@/lib/actions/respond"
import { effectiveSettings, formPhase } from "@/lib/domain/form"
import type { Form } from "@/lib/domain/types"
import { paths, ticketChoices, when } from "@/lib/form-copy"
import { PHASE_BADGE } from "@/lib/labels"
import { getStaff, mayAccess } from "@/lib/server/auth"
import { siteOrigin } from "@/lib/server/site-url"
import { getFormBySlug } from "@/lib/store"
import { FormHeader } from "@/components/form-header"
import { ResponseForm } from "@/components/response-form"

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const form = await getFormBySlug((await params).slug)
  if (!form || form.status === "draft") return { title: "Form" }
  return { title: form.title, description: form.description.slice(0, 160) || undefined }
}

/** A form, open for responses or saying why not. A draft shows only to signed-in staff, as a preview. */
export default async function FormPage({ params }: PageProps<"/[slug]">) {
  await connection()
  const { slug } = await params
  const form = await getFormBySlug(slug)
  if (!form) notFound()
  const preview = form.status === "draft"
  if (preview) {
    const staff = await getStaff()
    if (!staff || !mayAccess(staff, form)) notFound()
  }

  const now = new Date()
  const phase = formPhase(form, now)
  const settings = effectiveSettings(form.settings, form.tickets)
  const taking = phase === "open" || preview
  // Signed in: start from the account's details. An anonymous form never reads the session.
  const session = taking && settings.collectEmail ? await getSession() : null
  const profile = session ? await getProfile(session.uid) : null
  const prefill = session
    ? {
        identity: { name: profile?.name || session.name, email: session.email, wechatId: profile?.wechatId ?? "", campus: "" as const },
        values: {},
        files: {},
      }
    : undefined

  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      <FormHeader form={form}>
        <StatusBadge domain="form" value={form.cancelledAt ? "cancelled" : PHASE_BADGE[phase]} />
      </FormHeader>

      {preview && (
        <Alert variant="warning">
          <AlertTitle>Draft preview</AlertTitle>
          <AlertDescription>
            Only the organizers can open this page until the form opens. Answers sent from here
            are refused.
          </AlertDescription>
        </Alert>
      )}

      {taking ? (
        <>
          {phase === "open" && form.closesAt && (
            <p className="type-body-sm text-muted">Closes {when(form.closesAt)} Shenzhen time.</p>
          )}
          {settings.collectEmail &&
            (session ? (
              <p className="type-body-sm text-muted">Filled in from your PPITSZ account, {session.email}. Change anything that&apos;s different.</p>
            ) : (
              <p className="type-body-sm text-muted">
                Have a PPITSZ account? <Link href={signInUrl(`${await siteOrigin()}${paths.form(form)}`)}>Sign in</Link> and your
                details are filled in.
              </p>
            ))}
          <ResponseForm
            mode="new"
            initial={prefill}
            action={submitAction.bind(null, form.id)}
            sections={form.sections}
            line={form.line}
            ask={{ email: settings.collectEmail, contact: settings.collectContact }}
            ticketTypes={ticketChoices(form, now)}
            submitLabel={form.tickets.enabled ? "Sign up" : "Send"}
          />
        </>
      ) : (
        <ClosedNotice form={form} phase={phase} />
      )}

      <WayfindingSigns form={form} lostProperty={settings.collectEmail && phase !== "draft"} />
    </Container>
  )
}

/**
 * Where to go after the form, as station signs: the venue, and lost
 * property for someone who already answered but lost the email.
 */
function WayfindingSigns({ form, lostProperty }: { form: Form; lostProperty: boolean }) {
  const venue = form.tickets.enabled && form.tickets.venue
  if (!venue && !lostProperty) return null
  return (
    <SignBoard aria-label="Signs">
      {venue && (
        <Sign
          lead={
            <SignPictogram>
              <MapPinIcon />
            </SignPictogram>
          }
          title={venue}
          description="Venue: show your ticket's QR code at the door"
        />
      )}
      {lostProperty && (
        <Sign
          href={paths.back(form)}
          linkAs={NextLink}
          direction="right"
          lead={
            <SignPictogram>
              <MagnifyingGlassIcon />
            </SignPictogram>
          }
          title="Lost property"
          description={form.tickets.enabled ? "Signed up and lost your ticket? Find it by email" : "Already answered? Find your answers by email"}
        />
      )}
    </SignBoard>
  )
}

/**
 * Why the form takes no answers. Canceled and closed are the service itself
 * changing: a service notice. Not open yet shows when it opens and closes.
 */
function ClosedNotice({ form, phase }: { form: Form; phase: ReturnType<typeof formPhase> }) {
  if (form.cancelledAt) {
    return (
      <ServiceNotice kind="suspended" lines={[form.line]} updatedAt={form.cancelledAt} title="This event was canceled">
        <p>Ticket holders have been told by email.</p>
      </ServiceNotice>
    )
  }
  if (phase === "upcoming" && form.opensAt) {
    return (
      <Timetable
        title={form.tickets.enabled ? "Sign-ups" : "Answers"}
        line={form.line}
        rows={[
          { label: "Opens", at: form.opensAt },
          { label: "Closes", at: form.closesAt, none: "No end date" },
        ]}
        footnote="Shenzhen time. Come back when it opens."
      />
    )
  }
  if (phase === "full") {
    return (
      <Alert variant="info">
        <AlertTitle>Fully booked</AlertTitle>
        <AlertDescription>Every place is taken. If someone cancels, their place opens up here again.</AlertDescription>
      </Alert>
    )
  }
  return (
    <ServiceNotice kind="ended" lines={[form.line]} title="This form has closed">
      <p>It no longer takes answers.</p>
    </ServiceNotice>
  )
}
