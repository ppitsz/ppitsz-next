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
  experimental: {
    serverActions: {
      // File answers (lib/store/media.ts UPLOAD_MAX_BYTES) plus the text answers.
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
