"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Button } from "@ppitsz/ui/components/button"
import { FieldGroup } from "@ppitsz/ui/components/field"
import { MIN_PASSWORD_LENGTH, type ProfileFields } from "@ppitsz/accounts/fields"
import type { ActionState } from "@/lib/actions/state"
import {
  addPasswordAction,
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  unlinkGoogleAction,
  updateProfileAction,
} from "@/lib/actions/account"
import { TextField } from "@/components/text-field"

/*
 * Sign-in, sign-up, password and profile forms. Fields are controlled, so an
 * error from the server doesn't clear what was typed.
 */

const INITIAL: ActionState = {}

function Problem({ state, title }: { state: ActionState; title: string }) {
  if (!state.error) return null
  return (
    <Alert variant="danger" live>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

export function SignInForm({ next, email: initialEmail = "" }: { next: string; email?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL)
  const [email, setEmail] = useState(initialEmail)

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          error={state.fieldErrors?.email}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={state.fieldErrors?.password}
        />
      </FieldGroup>
      <Problem state={state} title="Couldn't sign in" />
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <Link href="/forgot-password" className="self-start type-ui text-accent-text underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </form>
  )
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpAction, INITIAL)
  const [values, setValues] = useState({ name: "", email: "" })
  const field = (name: keyof typeof values) => ({
    value: values[name],
    onChange: (value: string) => setValues((current) => ({ ...current, [name]: value })),
    error: state.fieldErrors?.[name],
  })

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <TextField
          name="name"
          label="Name"
          helper="As on your WeChat, so Danus and panitia can recognize you."
          autoComplete="name"
          {...field("name")}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          helper="To sign in and change your password. QQ or 163 email works too."
          autoComplete="email"
          {...field("email")}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          autoComplete="new-password"
          error={state.fieldErrors?.password}
        />
      </FieldGroup>
      <Problem state={state} title="Account not created" />
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL)
  const [email, setEmail] = useState("")

  if (state.done) {
    return (
      <Alert variant="success" live>
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          <p>
            If {state.message} has an account, a link to set a new password has been sent there. Check your spam folder
            too. The link works for 1 hour.
          </p>
          {state.devLink && (
            <p>
              Development: no email is sent. <Link href={state.devLink}>Open the link here.</Link>
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <TextField
        name="email"
        label="Your account's email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={state.fieldErrors?.email}
      />
      <Problem state={state} title="Link not sent" />
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {pending ? "Sending…" : "Send link"}
      </Button>
    </form>
  )
}

export function ResetPasswordForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, code), INITIAL)

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <TextField
        name="password"
        label="New password"
        type="password"
        helper={`At least ${MIN_PASSWORD_LENGTH} characters. Every device will be signed out of your account, in every app.`}
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      {state.error && (
        <Alert variant="danger" live>
          <AlertTitle>Password not changed</AlertTitle>
          <AlertDescription>
            {state.error} <Link href="/forgot-password">Ask for a new link</Link>
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  )
}

/** For an account that signs in with Google only. Once added, the page shows Change password instead. */
export function AddPasswordForm() {
  const [state, action, pending] = useActionState(addPasswordAction, INITIAL)

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-6" noValidate>
      <TextField
        name="password"
        label="New password"
        type="password"
        helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <Problem state={state} title="Password not added" />
      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Adding…" : "Add password"}
      </Button>
    </form>
  )
}

export function UnlinkGoogleForm() {
  const [state, action, pending] = useActionState(unlinkGoogleAction, INITIAL)

  return (
    <form action={action} className="flex w-full flex-col items-start gap-4">
      <Problem state={state} title="Google not unlinked" />
      <Button type="submit" loading={pending}>
        {pending ? "Unlinking…" : "Unlink Google"}
      </Button>
    </form>
  )
}

export function ProfileForm({ profile }: { profile: ProfileFields }) {
  const [state, action, pending] = useActionState(updateProfileAction, INITIAL)
  const [values, setValues] = useState(profile)
  const field = (name: keyof ProfileFields) => ({
    value: values[name],
    onChange: (value: string) => setValues((current) => ({ ...current, [name]: value })),
    error: state.fieldErrors?.[name],
  })

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <TextField name="name" label="Name" autoComplete="name" {...field("name")} />
        <TextField
          name="wechatId"
          label="WeChat ID"
          optional
          helper="Danus asks for it at checkout, so they can reach you about an order."
          autoComplete="off"
          {...field("wechatId")}
        />
        <TextField
          name="phone"
          label="Phone number"
          optional
          helper="Needed for delivery orders."
          type="tel"
          autoComplete="tel"
          {...field("phone")}
        />
      </FieldGroup>
      <Problem state={state} title="Not saved" />
      {state.done && !pending && (
        <p role="status" className="type-body-sm text-success-text">
          Saved. Every app uses these details from now on.
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
