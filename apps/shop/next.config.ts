import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@ppitsz/ui", "@ppitsz/accounts"],
  // The Admin SDK talks to Google over gRPC; keep it out of the bundle.
  serverExternalPackages: ["firebase-admin"],
  // The share images read their fonts from disk (lib/og.ts); ship them with those routes.
  outputFileTracingIncludes: {
    "/opengraph-image*": ["./assets/fonts/*.woff"],
    "/**/opengraph-image*": ["./assets/fonts/*.woff"],
  },
  // The booth screen was "Kasir" until Nov 2026; keep booth phones' bookmarks working.
  async redirects() {
    return [{ source: "/staff/kasir", destination: "/staff/register", permanent: true }]
  },
  experimental: {
    serverActions: {
      // Payment proof screenshots (lib/store/media.ts PROOF_MAX_BYTES) plus form fields.
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    // The monorepo root. Set explicitly because the enclosing repository has
    // its own lockfile, which would otherwise be picked as the root.
    root: path.resolve(process.cwd(), "../.."),
  },
}

export default nextConfig
