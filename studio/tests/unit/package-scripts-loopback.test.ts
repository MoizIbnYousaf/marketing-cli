// tests/unit/package-scripts-loopback.test.ts
//
// Static check: every studio/package.json script that starts `next dev` or
// `next start` must bind loopback (Next's own default is every interface).
// The host must be a literal: `${DASHBOARD_HOST:-127.0.0.1}` is not expanded
// by Bun's shell (the default for `bun run` on Windows) or by cmd, so Next
// would receive the text itself. DASHBOARD_HOST stays a launcher override.
// Starting Next itself is too slow for a unit test, so this reads the scripts.

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")) as {
  scripts: Record<string, string>
}

const nextInvocations = Object.entries(pkg.scripts).flatMap(([name, script]) =>
  [...script.matchAll(/next (dev|start)\b([^&;|]*)/g)].map((m) => ({ name, args: m[2] ?? "" })),
)

const hostArg = (args: string): string | null => args.match(/(?:-H|--hostname)\s+(\S+)/)?.[1] ?? null

describe("studio package scripts bind loopback", () => {
  test("there are next dev/start scripts to check", () => {
    expect(nextInvocations.length).toBeGreaterThanOrEqual(2)
  })

  test("every next dev/start passes the literal host 127.0.0.1", () => {
    for (const { name, args } of nextInvocations) {
      expect({ name, host: hostArg(args) }).toEqual({ name, host: "127.0.0.1" })
    }
  })

  test("Bun's shell passes the same host to Next", async () => {
    // `bun exec` runs a command line through Bun's shell, the default for
    // `bun run` on Windows; it must hand Next 127.0.0.1, not unexpanded text.
    for (const { name, args } of nextInvocations) {
      const proc = Bun.spawn([process.execPath, "--no-env-file", "exec", `echo ${hostArg(args) ?? ""}`], {
        stdout: "pipe",
      })
      const host = (await new Response(proc.stdout).text()).trim()
      await proc.exited
      expect({ name, host }).toEqual({ name, host: "127.0.0.1" })
    }
  })
})
