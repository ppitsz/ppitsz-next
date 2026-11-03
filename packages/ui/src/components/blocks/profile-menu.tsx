"use client"

import * as React from "react"
import { CaretDownIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react"

import { cn } from "@ppitsz/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage, initials } from "@ppitsz/ui/components/avatar"
import { buttonVariants } from "@ppitsz/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ppitsz/ui/components/dropdown-menu"

/*
 * Profile menu: the one way every app shows who is signed in (the header's
 * account slot). Signed out: a "Sign in" capsule. Signed in: a capsule with
 * the avatar and first name that opens a menu: the avatar, name and email
 * (and the role in this app, for staff), the app's own links, "Your
 * account" (PPITSZ Account, where the photo and details are edited) and
 * "Sign out", which signs out of every app (ADR 0008).
 */

export interface ProfileMenuAccount {
  /** "" when they haven't set one: the email stands in. */
  name: string
  email: string
  avatarUrl: string | null
  /** Their role in this app: "Admin", "Form admin". */
  role?: string
}

export interface ProfileMenuLink {
  href: string
  label: string
  icon?: React.ReactNode
}

function PersonAvatar({ account, size }: { account: ProfileMenuAccount; size: "sm" | "default" | "lg" }) {
  return (
    <Avatar size={size}>
      {account.avatarUrl && <AvatarImage src={account.avatarUrl} />}
      <AvatarFallback>{initials(account.name || account.email)}</AvatarFallback>
    </Avatar>
  )
}

function ProfileMenu({
  account,
  signInHref,
  accountHref,
  links = [],
  signOut,
  linkAs,
  signInLabel = "Sign in",
  accountLabel = "Your account",
  signOutLabel = "Sign out",
  className,
}: {
  account: ProfileMenuAccount | null
  signInHref: string
  /** PPITSZ Account's profile page: a full URL from another app, "/" in it. */
  accountHref: string
  /** This app's own places for the person: "Your orders". Client-side links via linkAs. */
  links?: ProfileMenuLink[]
  /** Signs out of every app, then goes where the app wants (a server action). */
  signOut: () => Promise<void> | void
  linkAs?: React.ElementType
  signInLabel?: string
  accountLabel?: string
  signOutLabel?: string
  className?: string
}) {
  const Link: React.ElementType = linkAs ?? "a"
  const [signingOut, startSignOut] = React.useTransition()

  if (!account) {
    return (
      <Link href={signInHref} className={buttonVariants({ size: "sm", className })}>
        <UserIcon aria-hidden />
        {signInLabel}
      </Link>
    )
  }

  const shownName = account.name || account.email
  const firstName = account.name.split(" ")[0] || accountLabel

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${accountLabel}: ${shownName}`}
        className={cn(
          "inline-flex min-h-11 max-w-56 items-center gap-2 rounded-full border border-border-strong py-1 ps-1 pe-3 type-ui text-text outline-none transition-colors duration-(--duration-fast) ease-out hover:bg-surface-strong data-popup-open:bg-surface-strong",
          className
        )}
      >
        <PersonAvatar account={account} size="default" />
        <span className="truncate">{firstName}</span>
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <div className="flex items-center gap-3 px-2 pt-2 pb-3">
          <PersonAvatar account={account} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate type-ui text-text">{shownName}</span>
            {account.name && <span className="truncate type-caption text-muted">{account.email}</span>}
            {account.role && <span className="type-kicker text-muted">{account.role}</span>}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="flex flex-col gap-0.5 py-1">
          {links.map((link) => (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
              {link.icon}
              {link.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem render={<a href={accountHref} />}>
            <UserIcon aria-hidden />
            {accountLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          closeOnClick={false}
          onClick={() => startSignOut(async () => await signOut())}
          className="mt-1"
        >
          <SignOutIcon aria-hidden />
          {signingOut ? "Signing out…" : signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ProfileMenu }
