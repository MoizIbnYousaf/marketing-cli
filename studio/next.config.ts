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
  // Browser tests and orb portals address the dev server by loopback IP.
  // Explicitly allow that hostname so Next's dev-tools issue overlay does not
  // report a cross-origin warning for its own `/_next/*` assets.
  allowedDevOrigins: ["127.0.0.1"],
  // Lets the E2E perf suite build into an isolated .next-perf dir so a
  // concurrently running `next dev` (from another team-mate's lane) does
  // not wipe production server-app artifacts mid-test. Default is ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: PACKAGE_ROOT,
  },
  outputFileTracingRoot: PACKAGE_ROOT,
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "recharts",
      "react-markdown",
      "cmdk",
      "radix-ui",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "Permissions-Policy", value: "tools=(self)" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ]
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
