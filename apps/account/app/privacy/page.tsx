import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Container } from "@ppitsz/ui/components/container"
import { formatLongDate } from "@ppitsz/ui/lib/format"

export const metadata: Metadata = { title: "Privacy" }

/** Questions and requests about your data. Change it when the project moves to PPIT's own account (ADR 0006). */
const CONTACT_EMAIL = "vlocitize@gmail.com"
const UPDATED = new Date("2026-11-12T12:00:00+08:00")

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading-lg text-text">
        {title}
      </h2>
      <div className="flex max-w-[66ch] flex-col gap-3 type-body text-text">{children}</div>
    </section>
  )
}

/**
 * The privacy policy for every PPITSZ app: one account, one policy. Public,
 * and linked from Google's consent screen (ADR 0011). Keep it to what the
 * apps really store.
 */
export default function PrivacyPage() {
  return (
    <Container narrow className="flex flex-col gap-10 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">Privacy</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          What the PPIT Shenzhen apps (PPITSZ Account, Shop and Forms) keep about you, why, and how to have it changed or
          deleted. Updated {formatLongDate(UPDATED)}.
        </p>
      </div>

      <Section id="who" title="Who we are">
        <p>
          PPI Tiongkok Cabang Shenzhen (PPIT Shenzhen) is the association of Indonesian students in Shenzhen. We run
          these apps for our members and anyone who orders from the shop or signs up for our events.
        </p>
      </Section>

      <Section id="what" title="What we keep">
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            <strong>Your account:</strong> your email, name and password (stored by Firebase as a hash, never readable),
            and, if you add them, your WeChat ID, phone number and photo.
          </li>
          <li>
            <strong>Google, if you link it:</strong> your Google account&apos;s id, email and name, and a copy of its
            photo. We ask Google for nothing else: not your contacts, files or anything in your Google account.
          </li>
          <li>
            <strong>Shop orders:</strong> what you ordered, your payment proof, and for delivery your address.
          </li>
          <li>
            <strong>Form responses:</strong> your answers and any files you upload, and your ticket for an event.
          </li>
          <li>
            <strong>Staff roles:</strong> for organizers and shop staff, their roles and a log of who changed them.
          </li>
        </ul>
      </Section>

      <Section id="why" title="Why">
        <p>
          Only to run the apps: to sign you in, fill in your details for you, let us handle your order and reach you
          about it on WeChat, and let organizers run their events. We don&apos;t sell your data, show ads or use analytics or
          tracking.
        </p>
      </Section>

      <Section id="who-sees" title="Who sees it">
        <p>
          You see your own data. Shop staff see the orders they handle, organizers see the responses to their own forms,
          and Portal admins see accounts and roles. Nobody else in PPIT Shenzhen does.
        </p>
        <p>
          It is stored with Google Firebase (in Hong Kong) and served by Vercel, who keep it for us and don&apos;t use it
          themselves. Emails are sent through Firebase or an email service on our behalf.
        </p>
      </Section>

      <Section id="cookies" title="Cookies">
        <p>
          One cookie keeps you signed in, for up to 14 days, in every PPITSZ app. Another lasts ten minutes while you
          continue with Google. The shop keeps your cart on your device, and a device cookie limits how many unpaid
          orders one phone can open. To stop spam we count requests for a short
          time, stored scrambled, never as your IP address.
        </p>
      </Section>

      <Section id="how-long" title="How long">
        <p>
          Your account and profile stay until you ask us to delete them. Form responses are deleted 90 days after their
          event ends. Shop orders stay as our sales records.
        </p>
      </Section>

      <Section id="your-data" title="Your data, your choice">
        <p>
          You can change your details and photo, and unlink Google, on your account page at any time. To see everything
          we keep about you, correct it, or delete your account, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-text underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          . You can also remove our access in your Google account&apos;s settings, under third-party connections.
        </p>
      </Section>
    </Container>
  )
}
