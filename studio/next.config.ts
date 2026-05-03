import path from "node:path"
import type { NextConfig } from "next"

// When mktg-studio ships inside the marketing-cli npm tarball, `next` lives in
// the *root* node_modules (`marketing-cli/node_modules/next`) — not in
// `studio/node_modules`. If a package manager later creates an empty
// `studio/node_modules/` (e.g. Next.js auto-installing TypeScript via pnpm to
// parse this very file), Next.js' workspace-root inference would walk up from
// `studio/app/`, hit that empty directory first, and fail with
// "couldn't find next/package.json". Pin the root explicitly to the
// marketing-cli package root so resolution is deterministic.
//
// Next.js loads next.config.ts with cwd set to the studio package directory
// (it's the dir that owns this package.json). PACKAGE_ROOT walks one level up.
// `import.meta.url` was avoided because Next 16 compiles next.config.ts to a
// `.js` file in an ESM-typed package, but emits CJS exports — making the
// compiled output blow up with "exports is not defined in ES module scope"
// when ESM-only constructs are used at the top level.
const PACKAGE_ROOT = path.resolve(process.cwd(), "..")

// Server-side: where the Bun studio API is actually running. Used by the
// `/api/:path*` rewrite below. Prefer the private STUDIO_API_BASE so the
// public client variable can stay unset (= same-origin, proxied via this
// rewrite) — that keeps EventSource/SSE on the same origin and avoids CORS.
const STUDIO_API_BASE =
  process.env.STUDIO_API_BASE?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_STUDIO_API_BASE?.replace(/\/$/, "") ??
  "http://localhost:3001"

const nextConfig: NextConfig = {
  turbopack: {
    root: PACKAGE_ROOT,
  },
  outputFileTracingRoot: PACKAGE_ROOT,
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  async rewrites() {
    return [
      // Forward every /api/* request to the Bun studio server. The studio has
      // no Next.js API routes — all endpoints live in server.ts on :3001.
      { source: "/api/:path*", destination: `${STUDIO_API_BASE}/api/:path*` },
    ]
  },
}

export default nextConfig
