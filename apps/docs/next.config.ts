import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@ppitsz/ui"],
  turbopack: {
    // The monorepo root. Set explicitly because the enclosing repository has
    // its own lockfile, which would otherwise be picked as the root.
    root: path.resolve(process.cwd(), "../.."),
  },
}

export default nextConfig
