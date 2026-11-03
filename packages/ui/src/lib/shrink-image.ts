/*
 * Browser-side image shrinking before upload. Phone photos and screenshots
 * can be several MB; the server accepts up to 4 MB and slow campus Wi-Fi
 * hates big uploads. Re-encodes as JPEG at most `maxSide` px on the long side.
 * Shared by every app: payment proofs, product photos, form files, avatars.
 */

export async function shrinkImage(
  file: File,
  { maxSide = 1600, skipBelowBytes = 700 * 1024, force = false } = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  if (!force && file.size < skipBelowBytes) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")!
    // JPEG has no transparency: a transparent PNG would turn black.
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
    if (!blob || (!force && blob.size >= file.size)) return file
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    // The browser can't decode it (e.g. HEIC outside Safari): send it as is.
    return file
  }
}
