import type { Metadata } from "next"
import NextLink from "next/link"
import { connection } from "next/server"
import { PlusIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Badge } from "@ppitsz/ui/components/badge"
import { Button, buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Field, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { SHOP_ROLE_LABELS } from "@ppitsz/accounts/role-labels"
import { listStaffAccounts, type StaffAccount } from "@ppitsz/accounts/roles"
import { findAction } from "@/lib/actions/admin"
import { requirePortalAdmin } from "@/lib/server/auth"

export const metadata: Metadata = { title: "Accounts" }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

function RoleBadges({ account }: { account: StaffAccount }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {account.portalAdmin && <Badge variant="highlight">Portal admin</Badge>}
      {account.shop && <Badge variant="outline">{SHOP_ROLE_LABELS[account.shop]}</Badge>}
      {account.formsAdmin && <Badge variant="outline">Form admin</Badge>}
      {account.siteAdmin && <Badge variant="outline">Website admin</Badge>}
      {account.organizing.length > 0 && (
        <Badge variant="neutral">
          Organizer · {account.organizing.length} {account.organizing.length === 1 ? "form" : "forms"}
        </Badge>
      )}
    </span>
  )
}

/** Every account with a role, and a search for any account by email. Portal admins only. */
export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  await connection()
  await requirePortalAdmin("/accounts")
  const missing = first((await searchParams).missing)
  const accounts = await listStaffAccounts()

  return (
    <Container className="flex flex-col gap-10 py-10 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="type-kicker text-accent-text">Portal admin</p>
          <h1 className="type-display-xl text-text">Accounts</h1>
          <p className="max-w-[66ch] type-lede text-muted">
            Everyone with a role in any app. Changes work on their next page, without signing them out.
          </p>
        </div>
        <NextLink href="/accounts/new" className={buttonVariants({ variant: "primary" })}>
          <PlusIcon aria-hidden />
          Add person
        </NextLink>
      </div>

      <section aria-labelledby="find" className="flex flex-col gap-4">
        <h2 id="find" className="type-heading-lg text-text">
          Find an account
        </h2>
        <form action={findAction} className="flex flex-wrap items-end gap-3">
          <Field className="max-w-96 flex-1">
            <FieldLabel htmlFor="find-email">Email</FieldLabel>
            <Input id="find-email" name="email" type="email" autoComplete="off" defaultValue={missing ?? ""} />
          </Field>
          <Button type="submit">Find</Button>
        </form>
        {missing !== undefined && (
          <Alert variant="warning">
            <AlertTitle>No account with {missing || "that email"}</AlertTitle>
            <AlertDescription>
              <NextLink href={`/accounts/new?email=${encodeURIComponent(missing)}`}>Add them</NextLink> to make one.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section aria-labelledby="staff" className="flex flex-col gap-4">
        <h2 id="staff" className="type-heading-lg text-text">
          With a role ({accounts.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-strong">
                <th scope="col" className="py-2 pe-4 type-kicker text-muted">
                  Name
                </th>
                <th scope="col" className="py-2 pe-4 type-kicker text-muted">
                  Email
                </th>
                <th scope="col" className="py-2 type-kicker text-muted">
                  Roles
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.uid} className="border-b">
                  <td className="py-3 pe-4 type-ui text-text">
                    <NextLink href={`/accounts/${account.uid}`} className="underline-offset-4 hover:underline">
                      {account.name || account.email}
                    </NextLink>
                  </td>
                  <td className="py-3 pe-4 type-body-sm text-muted">{account.email}</td>
                  <td className="py-3">
                    <RoleBadges account={account} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Container>
  )
}
