import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { Container } from "@ppitsz/ui/components/container"
import { Link } from "@ppitsz/ui/components/link"
import { formatDate } from "@ppitsz/ui/lib/format"
import { adminAuth } from "@ppitsz/accounts/firebase"
import { getProfile } from "@ppitsz/accounts/profile"
import { roleChangesOf, rolesOf } from "@ppitsz/accounts/roles"
import { formsOrigin } from "@ppitsz/accounts/urls"
import { requirePortalAdmin } from "@/lib/server/auth"
import { ResetPasswordButton, RolesForm } from "@/components/accounts"
import { RoleChanges } from "@/components/role-changes"

export const metadata: Metadata = { title: "Account" }

const STATUS_LABELS: Record<string, string> = { draft: "Draft", open: "Open", closed: "Closed" }

/** One person: their roles in every app, their password, and the history of both. Portal admins only. */
export default async function PersonPage({ params }: PageProps<"/accounts/[uid]">) {
  await connection()
  const { uid } = await params
  const session = await requirePortalAdmin(`/accounts/${uid}`)
  const user = await adminAuth()
    .getUser(uid)
    .catch(() => null)
  if (!user) notFound()
  const [roles, profile, changes] = await Promise.all([rolesOf(uid), getProfile(uid), roleChangesOf(uid)])
  const email = user.email ?? ""
  const name = profile?.name || user.displayName || email

  return (
    <Container className="flex flex-col gap-12 py-10 lg:py-16">
      <div className="flex flex-col gap-3">
        <p className="type-kicker text-accent-text">Account</p>
        <h1 className="type-display-xl text-text">{name}</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          {email}
          {profile?.wechatId && ` · WeChat ${profile.wechatId}`}
          {user.metadata.creationTime && ` · since ${formatDate(new Date(user.metadata.creationTime))}`}
        </p>
      </div>

      <div className="@container grid gap-12 @3xl:grid-cols-2">
        <section aria-labelledby="roles" className="flex flex-col gap-4">
          <h2 id="roles" className="type-heading-lg text-text">
            Roles
          </h2>
          {session.uid === uid && (
            <p className="type-body-sm text-muted">This is you. Another Portal admin has to remove your Portal admin role.</p>
          )}
          <RolesForm uid={uid} roles={{ shop: roles.shop, formsAdmin: roles.formsAdmin, portalAdmin: roles.portalAdmin, siteAdmin: roles.siteAdmin }} />
        </section>

        <div className="flex flex-col gap-12">
          <section aria-labelledby="organizing" className="flex flex-col gap-4">
            <h2 id="organizing" className="type-heading-lg text-text">
              Organizer
            </h2>
            {roles.organizing.length === 0 ? (
              <p className="type-body text-muted">Not an organizer of any form that hasn&apos;t ended.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {roles.organizing.map((form) => (
                  <li key={form.id} className="type-body text-text">
                    <Link href={`${formsOrigin()}/staff/${form.id}`}>{form.title || "Untitled form"}</Link>
                    <span className="text-muted"> · {STATUS_LABELS[form.status] ?? form.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="type-body-sm text-muted">Organizers are added and removed on each form, in PPITSZ Forms.</p>
          </section>

          <section aria-labelledby="password" className="flex flex-col items-start gap-4">
            <h2 id="password" className="type-heading-lg text-text">
              Password
            </h2>
            <p className="max-w-[66ch] type-body text-muted">
              For a lost password or a booth phone that changed hands. They can also reset it themselves with Forgot
              password.
            </p>
            <ResetPasswordButton uid={uid} email={email} />
          </section>
        </div>
      </div>

      <section aria-labelledby="history" className="flex flex-col gap-4">
        <h2 id="history" className="type-heading-lg text-text">
          History
        </h2>
        <RoleChanges changes={changes} showTarget={false} />
      </section>
    </Container>
  )
}
