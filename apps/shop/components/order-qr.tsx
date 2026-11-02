import QRCode from "qrcode"

/**
 * The pickup QR, rendered on the server as inline SVG (no image request, and
 * it survives a screenshot). It encodes the order's link, so scanning it with
 * any camera also opens the order. Always black on white, whatever the theme:
 * scanners need the contrast.
 */
export async function OrderQr({ url, code }: { url: string; code: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 3,
    color: { dark: "#000000", light: "#ffffff" },
  })
  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        role="img"
        aria-label={`QR code for order ${code}`}
        className="w-full max-w-72 overflow-hidden rounded-xl [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="flex flex-col items-center gap-1">
        <span className="type-caption text-muted">If the QR code won't scan, say this code</span>
        <span className="type-numeral text-text">{code}</span>
      </figcaption>
    </figure>
  )
}
