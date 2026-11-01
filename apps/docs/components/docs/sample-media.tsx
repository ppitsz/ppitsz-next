import Image from "next/image"

/** Real sample photos for the media slots. Thumbnails named by their title use alt="". */
const PHOTOS = {
  group: { src: "/samples/group.webp", width: 6000, height: 4000 },
  beach: { src: "/samples/event-1.webp", width: 2456, height: 1842 },
  night: { src: "/samples/event-2.webp", width: 1915, height: 1436 },
  batik: { src: "/samples/event-3.webp", width: 1915, height: 1436 },
} as const

export type PhotoKey = keyof typeof PHOTOS

export function SamplePhoto({
  photo,
  alt = "",
  sizes,
  priority,
  className,
}: {
  photo: PhotoKey
  alt?: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const p = PHOTOS[photo]
  return (
    <Image
      src={p.src}
      width={p.width}
      height={p.height}
      alt={alt}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  )
}
