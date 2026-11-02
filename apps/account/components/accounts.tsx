"use client"

import Link from "next/link"
import { useActionState, useState, useTransition } from "react"
import { CopyIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ppitsz/ui/components/alert-dialog"
import { Button } from "@ppitsz/ui/components/button"
import { Checkbox } from "@ppitsz/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@ppitsz/ui/components/field"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { SHOP_ROLE_LABELS, SHOP_ROLES, type ShopRole } from "@ppitsz/accounts/role-labels"
import { addPersonAction, resetPasswordForAction, saveRolesAction } from "@/lib/actions/admin"
import type { ActionState } from "@/lib/actions/state"
import { TextField } from "@/components/text-field"

/* Accounts, for Portal admins: adding a person, their roles, their password. */

const INITIAL: ActionState = {}

export interface RoleValues {
  shop: ShopRole | null
  formsAdmin: boolean
  portalAdmin: boolean
}

function Toggle({ name, label, help, defaultChecked }: { name: string; label: string; help: string; defaultChecked: boolean }) {
  return (
    <FieldLabel htmlFor={`role-${name}`}>
      <Field orientation="horizontal">
        <Checkbox id={`role-${name}`} name={name} defaultChecked={defaultChecked} />
        <FieldContent>
          <span className="type-ui text-text">{label}</span>
          <FieldDescription>{help}</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  )
}

/** One control per app. `key` the parent on the saved roles so a failed save shows what is really stored. */
function RoleFields({ roles }: { roles: RoleValues }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="role-shop">Shop (Danus)</FieldLabel>
        <NativeSelect id="role-shop" name="shop" defaultValue={roles.shop ?? ""} aria-describedby="role-shop-helper">
          <NativeSelectOption value="">None</NativeSelectOption>
          {SHOP_ROLES.map((role) => (
            <NativeSelectOption key={role} value={role}>
              {SHOP_ROLE_LABELS[role]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription id="role-shop-helper">
          Booth staff hand over orders and record walk-in sales. Danus admins may do everything in the dashboard.
        </FieldDescription>
      </Field>
      <Toggle
        name="formsAdmin"
        label="Form admin"
        help="Creates forms on PPITSZ Forms and picks each form's panitia."
        defaultChecked={roles.formsAdmin}
      />
      <Toggle
        name="portalAdmin"
        label="Portal admin"
        help="Manages accounts here: gives and removes every app's roles and resets passwords."
        defaultChecked={roles.portalAdmin}
      />
    </FieldGroup>
  )
}

/** A new password, shown once, with a button to copy it for WeChat. */
export function NewPassword({ password, email }: { password: string; email: string }) {
  return (
    <Alert variant="success" live>
      <AlertTitle>Send them this password</AlertTitle>
      <AlertDescription>
        <p>
          Sign-in for {email}: <code className="type-ui">{password}</code>
        </p>
        <p>It's shown only once. They can change it with Forgot password.</p>
        <Button
          type="button"
          size="sm"
          className="mt-2"
          onClick={() =>
            navigator.clipboard.writeText(password).then(
              () => notify.success("Password copied"),
              () => notify.danger("Couldn't copy. Select it and copy it yourself.")
            )
          }
        >
          <CopyIcon aria-hidden />
          Copy password
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function AddPersonForm({ email: initialEmail = "" }: { email?: string }) {
  const [state, action, pending] = useActionState(addPersonAction, INITIAL)
  const [values, setValues] = useState({ email: initialEmail, name: "" })
  const field = (name: keyof typeof values) => ({
    value: values[name],
    onChange: (value: string) => setValues((current) => ({ ...current, [name]: value })),
    error: state.fieldErrors?.[name],
  })

  if (state.done && state.uid) {
    return (
      <div className="flex flex-col gap-6">
        {state.password ? (
          <NewPassword password={state.password} email={values.email} />
        ) : (
          <Alert variant="info" live>
            <AlertTitle>Roles given</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <Link href={`/accounts/${state.uid}`} className="self-start type-ui text-accent-text underline-offset-4 hover:underline">
          Open their account
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <TextField name="email" label="Email" type="email" autoComplete="off" {...field("email")} />
        <TextField
          name="name"
          label="Name"
          helper="Used only when the email has no account yet."
          autoComplete="off"
          {...field("name")}
        />
      </FieldGroup>
      <RoleFields roles={{ shop: null, formsAdmin: false, portalAdmin: false }} />
      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Not added</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {pending ? "Adding…" : "Add person"}
      </Button>
    </form>
  )
}

export function RolesForm({ uid, roles }: { uid: string; roles: RoleValues }) {
  const [state, action, pending] = useActionState(saveRolesAction.bind(null, uid), INITIAL)

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <RoleFields key={JSON.stringify(roles)} roles={roles} />
      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.done && !pending && (
        <p role="status" className="type-body-sm text-success-text">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {pending ? "Saving…" : "Save roles"}
      </Button>
    </form>
  )
}

export function ResetPasswordButton({ uid, email }: { uid: string; email: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [password, setPassword] = useState<string | null>(null)

  if (password) return <NewPassword password={password} email={email} />

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button />}>Reset password</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Give {email} a new password?</AlertDialogTitle>
          <AlertDialogDescription>
            Their current password stops working, and every device they use is signed out of every app. You'll see the
            new password once, to send them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await resetPasswordForAction(uid)
                if (result.password) {
                  setPassword(result.password)
                  setOpen(false)
                } else notify.danger(result.error ?? "Password not changed.")
              })
            }
          >
            Set a new password
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
