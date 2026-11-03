"use client"

import { startTransition, useActionState, useRef } from "react"
import { ImagesIcon, TrashIcon } from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage, initials } from "@ppitsz/ui/components/avatar"
import { Button } from "@ppitsz/ui/components/button"
import { shrinkImage } from "@ppitsz/ui/lib/shrink-image"
import { removeAvatarAction, updateAvatarAction } from "@/lib/actions/account"
import type { ActionState } from "@/lib/actions/state"

/*
 * The account's photo (ADR 0009): the avatar every app's profile menu shows.
 * Choosing one uploads it at once, shrunk in the browser to 512px. Without
 * one of their own, people see a linked sign-in's photo (Google, once it
 * exists) or their initials.
 */

const INITIAL: ActionState = {}

export function AvatarForm({
  name,
  avatarUrl,
  hasOwnPhoto,
}: {
  name: string
  /** What every app shows now: their own photo, a linked sign-in's, or null. */
  avatarUrl: string | null
  hasOwnPhoto: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [saved, save, saving] = useActionState(updateAvatarAction, INITIAL)
  const [removed, remove, removing] = useActionState(removeAvatarAction, INITIAL)
  // The newest answer wins: a removal after a save, or the other way round.
  const state = (removed.done ?? 0) > (saved.done ?? 0) || (removed.error && !saved.error) ? removed : saved

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const photo = await shrinkImage(file, { maxSide: 512, force: true })
    const data = new FormData()
    data.set("photo", photo)
    startTransition(() => save(data))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar size="xl">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start gap-3">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={choose}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => input.current?.click()} loading={saving} disabled={removing}>
              <ImagesIcon aria-hidden />
              {saving ? "Saving…" : hasOwnPhoto ? "Change photo" : "Choose a photo"}
            </Button>
            {hasOwnPhoto && (
              <Button variant="quiet" loading={removing} disabled={saving} onClick={() => startTransition(() => remove())}>
                <TrashIcon aria-hidden />
                Remove photo
              </Button>
            )}
          </div>
          <p className="max-w-[48ch] type-caption text-muted">
            {!hasOwnPhoto && avatarUrl
              ? "This photo comes from your linked sign-in. Choose one of your own to use it instead."
              : "Shown beside your name in every PPITSZ app. A square photo of your face works best."}
          </p>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="type-body-sm text-danger-text">
          {state.error}
        </p>
      )}
      {state.done && !state.error && !saving && !removing && (
        <p role="status" className="type-body-sm text-success-text">
          {state.message}
        </p>
      )}
    </div>
  )
}
