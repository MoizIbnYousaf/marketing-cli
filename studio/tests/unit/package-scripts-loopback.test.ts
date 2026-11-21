// tests/unit/package-scripts-loopback.test.ts
//
// Static check: every studio/package.json script that starts `next dev` or
// `next start` must bind a loopback host by default (Next's own default is
// every interface), honouring DASHBOARD_HOST like bin/mktg-studio.ts does.
// Starting Next itself is too slow for a unit test, so this reads the
// scripts and expands the -H argument with a real `sh`.

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")) as {
  scripts: Record<string, string>
}

const nextInvocations = Object.entries(pkg.scripts).flatMap(([name, script]) =>
  [...script.matchAll(/next (dev|start)\b([^&;|]*)/g)].map((m) => ({ name, args: m[2] ?? "" })),
)

const expandHost = async (args: string, env: Record<string, string>): Promise<string | null> => {
  const match = args.match(/(?:-H|--hostname)\s+(\S+)/)
  if (!match) return null
  const proc = Bun.spawn(["sh", "-c", `printf %s ${match[1]}`], {
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", ...env },
    stdout: "pipe",
  })
  const out = await new Response(proc.stdout).text()
  await proc.exited
  return out
}

describe("studio package scripts bind loopback", () => {
  test("there are next dev/start scripts to check", () => {
    expect(nextInvocations.length).toBeGreaterThanOrEqual(2)
  })

  test("every next dev/start binds 127.0.0.1 by default", async () => {
    for (const { name, args } of nextInvocations) {
      expect({ name, host: await expandHost(args, {}) }).toEqual({ name, host: "127.0.0.1" })
    }
  })

  test("DASHBOARD_HOST overrides the bind address", async () => {
    for (const { name, args } of nextInvocations) {
      const host = await expandHost(args, { DASHBOARD_HOST: "0.0.0.0" })
      expect({ name, host }).toEqual({ name, host: "0.0.0.0" })
    }
  })
})
