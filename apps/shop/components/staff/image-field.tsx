"use client"

import { useRef } from "react"
import { ImageIcon, TrashIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { cn } from "@ppitsz/ui/lib/utils"
import { shrinkImage } from "@/lib/client/shrink-image"

/** What happens to an image on save. */
export type ImageChoice = { kind: "keep" } | { kind: "new"; file: File; url: string } | { kind: "remove" }

export const KEEP_IMAGE: ImageChoice = { kind: "keep" }

const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Shrinks a new image for upload; anything not JPEG, PNG or WebP (HEIC) is converted. */
export async function imageForUpload(choice: ImageChoice) {
  if (choice.kind !== "new") return null
  return shrinkImage(choice.file, {
    maxSide: 1200,
    skipBelowBytes: 300 * 1024,
    force: !WEB_TYPES.includes(choice.file.type),
  })
}

/** Puts the image under `name` in a form, or `remove-${name}` when it is to be removed. */
export async function setImage(formData: FormData, name: string, choice: ImageChoice) {
  const file = await imageForUpload(choice)
  if (file) formData.set(name, file)
  if (choice.kind === "remove") formData.set(`remove-${name}`, "1")
}

/** Pick, preview, replace or remove one image (a product photo, a size chart, a payment QR). */
export function ImageField({
  id,
  label,
  helper,
  currentUrl,
  choice,
  onChange,
  alt,
  fit = "cover",
}: {
  id: string
  label: string
  helper?: string
  /** The stored image, if any. */
  currentUrl?: string
  choice: ImageChoice
  onChange: (choice: ImageChoice) => void
  alt: string
  /** "contain" shows all of a chart or a QR in the preview, instead of a square crop. */
  fit?: "cover" | "contain"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = choice.kind === "new" ? choice.url : choice.kind === "keep" ? currentUrl : undefined

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (choice.kind === "new") URL.revokeObjectURL(choice.url)
    onChange({ kind: "new", file, url: URL.createObjectURL(file) })
  }

  function remove() {
    if (choice.kind === "new") URL.revokeObjectURL(choice.url)
    onChange(currentUrl ? { kind: "remove" } : KEEP_IMAGE)
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="type-ui text-text">
        {label}
      </span>
      {helper && <p className="type-body-sm text-muted">{helper}</p>}
      <div className="flex flex-wrap items-end gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview or /media
          <img
            src={preview}
            alt={alt}
            className={cn("size-32 rounded-xl bg-surface", fit === "contain" ? "object-contain" : "object-cover")}
          />
        ) : (
          <span className="flex size-32 items-center justify-center rounded-xl bg-surface type-caption text-muted">
            No image yet
          </span>
        )}
        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={pick}
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <ImageIcon aria-hidden />
            {preview ? "Change image" : "Choose image"}
          </Button>
          {preview && (
            <Button variant="quiet" size="sm" onClick={remove}>
              <TrashIcon aria-hidden />
              Remove image
            </Button>
          )}
          {choice.kind === "remove" && (
            <span className="type-caption text-muted">The image is removed when you save.</span>
          )}
        </div>
      </div>
    </div>
  )
}
