import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"
import type { ReactNode } from "react"
import { StorefrontIcon, TicketIcon, UserIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Route } from "@ppitsz/ui/components/network/route"
import { Sign, SignBoard, SignPictogram } from "@ppitsz/ui/components/network/sign"
import { Container } from "@ppitsz/ui/components/container"
import { avatarUrl } from "@ppitsz/accounts/avatar"
import { profileOrBlank, shownAvatarPath } from "@ppitsz/accounts/profile"
import { SHOP_ROLE_LABELS } from "@ppitsz/accounts/role-labels"
import { latestRoleChanges, rolesOf } from "@ppitsz/accounts/roles"
import { appLive, formsOrigin, shopOrigin } from "@ppitsz/accounts/urls"
import { requireSession } from "@/lib/server/auth"
import { ProfileForm } from "@/components/auth-forms"
import { AvatarForm } from "@/components/avatar-form"
import { RoleChanges } from "@/components/role-changes"

export const metadata: Metadata = { title: "Your account" }

interface AppLink {
  href: string
  /** A staff app: your role in it. */
  kicker?: string
  title: string
  description: string
  /** The sign's pictogram. */
  icon: ReactNode
  /** On this app: a client-side link. */
  internal?: boolean
}

/** The apps as a station sign: every destination one row, with its pictogram and arrow. */
function AppSigns({ apps, label }: { apps: AppLink[]; label: string }) {
  return (
    <SignBoard aria-label={label} className="max-w-3xl">
      {apps.map((app) => (
        <Sign
          key={app.href}
          href={app.href}
          linkAs={app.internal ? NextLink : undefined}
          direction="right"
          headingLevel="h3"
          lead={<SignPictogram>{app.icon}</SignPictogram>}
          title={app.title}
          description={
            app.kicker ? (
              <>
                <span className="text-text">{app.kicker}</span> · {app.description}
              </>
            ) : (
              app.description
            )
          }
        />
      ))}
    </SignBoard>
  )
}

/** Everyone's home: their profile, the apps, and the staff apps they can open. */
export default async function HomePage() {
  await connection()
  const session = await requireSession()
  const [profile, roles] = await Promise.all([profileOrBlank(session), rolesOf(session.uid)])
  const changes = roles.portalAdmin ? await latestRoleChanges(10) : []

  const apps: AppLink[] = [
    {
      href: shopOrigin(),
      title: "PPITSZ Shop",
      icon: <StorefrontIcon />,
      description: "Order food and merchandise from Danus, and follow your orders.",
    },
    ...(appLive("forms")
      ? [
          {
            href: formsOrigin(),
            title: "PPITSZ Forms",
            icon: <TicketIcon />,
            description: "Event registrations, sign-ups and surveys.",
          },
        ]
      : []),
  ]
  const staff: AppLink[] = [
    ...(roles.shop
      ? [
          {
            href: `${shopOrigin()}/staff`,
            kicker: SHOP_ROLE_LABELS[roles.shop],
            title: "Shop dashboard",
            icon: <StorefrontIcon />,
            description:
              roles.shop === "admin"
                ? "Verify payments, and manage products and campaigns."
                : "Scan orders and record walk-in sales.",
          },
        ]
      : []),
    ...(appLive("forms") && (roles.formsAdmin || roles.panitia.length > 0)
      ? [
          {
            href: `${formsOrigin()}/staff`,
            kicker: roles.formsAdmin ? "Form admin" : "Panitia",
            title: "Forms dashboard",
            icon: <TicketIcon />,
            description: roles.formsAdmin
              ? "Create forms, and pick each form's panitia."
              : `Responses, check-in and announcements for ${roles.panitia.map((f) => f.title).join(", ")}.`,
          },
        ]
      : []),
    ...(roles.portalAdmin
      ? [
          {
            href: "/accounts",
            kicker: "Portal admin",
            title: "Accounts",
            icon: <UserIcon />,
            description: "Give and remove roles in every app, and reset passwords.",
            internal: true,
          },
        ]
      : []),
  ]

  return (
    <Container className="flex flex-col gap-12 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">PPITSZ Account</p>
        <h1 className="type-display-xl text-text">{profile.name || "Your account"}</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          Signed in as {session.email}, in every PPIT Shenzhen app.
        </p>
      </div>

      {staff.length > 0 && (
        <section aria-labelledby="staff" className="flex flex-col gap-4">
          <Route className="w-10" />
          <h2 id="staff" className="type-heading-lg text-text">
            Your staff apps
          </h2>
          <AppSigns apps={staff} label="Your staff apps" />
        </section>
      )}

      <section aria-labelledby="apps" className="flex flex-col gap-4">
        <Route className="w-10" />
        <h2 id="apps" className="type-heading-lg text-text">
          Apps
        </h2>
        <AppSigns apps={apps} label="Apps" />
      </section>

      <div className="@container grid gap-12 @3xl:grid-cols-2">
        <section aria-labelledby="profile" className="flex flex-col gap-4">
          <h2 id="profile" className="type-heading-lg text-text">
            Your details
          </h2>
          {!profile.wechatId && (
            <Alert variant="info">
              <AlertTitle>Add your WeChat ID</AlertTitle>
              <AlertDescription>Danus needs it to reach you about an order. The shop asks for it at checkout.</AlertDescription>
            </Alert>
          )}
          <AvatarForm
            name={profile.name || session.email}
            avatarUrl={avatarUrl(shownAvatarPath(profile))}
            hasOwnPhoto={!!profile.avatarPath}
          />
          <ProfileForm profile={{ name: profile.name, wechatId: profile.wechatId, phone: profile.phone }} />
        </section>

        <section aria-labelledby="password" className="flex flex-col items-start gap-4">
          <h2 id="password" className="type-heading-lg text-text">
            Password
          </h2>
          <p className="max-w-[66ch] type-body text-muted">
            Your email can&apos;t be changed. To change your password, we send a link to {session.email}. Every device
            is then signed out, in every app.
          </p>
          <NextLink href="/forgot-password" className="type-ui text-accent-text underline-offset-4 hover:underline">
            Change password
          </NextLink>
        </section>
      </div>

      {roles.portalAdmin && (
        <section aria-labelledby="changes" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="changes" className="type-heading-lg text-text">
              Latest role changes
            </h2>
            <NextLink href="/accounts" className="type-ui text-accent-text underline-offset-4 hover:underline">
              All accounts
            </NextLink>
          </div>
          <RoleChanges changes={changes} showTarget />
        </section>
      )}
    </Container>
  )
}
