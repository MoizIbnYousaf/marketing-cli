import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { diagnosePostiz, getScheduledPosts, listIntegrations } from "../../lib/postiz.ts"

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_POSTIZ_API_KEY = process.env.POSTIZ_API_KEY
const ORIGINAL_POSTIZ_API_BASE = process.env.POSTIZ_API_BASE

beforeEach(() => {
  process.env.POSTIZ_API_KEY = "ptz_test_key"
  process.env.POSTIZ_API_BASE = "http://localhost:4007"
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH

  if (ORIGINAL_POSTIZ_API_KEY === undefined) {
    delete process.env.POSTIZ_API_KEY
  } else {
    process.env.POSTIZ_API_KEY = ORIGINAL_POSTIZ_API_KEY
  }

  if (ORIGINAL_POSTIZ_API_BASE === undefined) {
    delete process.env.POSTIZ_API_BASE
  } else {
    process.env.POSTIZ_API_BASE = ORIGINAL_POSTIZ_API_BASE
  }
})

describe("getScheduledPosts", () => {
  test("unwraps the real Postiz { posts } envelope", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          posts: [
            {
              id: "pst_123",
              type: "draft",
              date: "2026-04-23T10:00:00.000Z",
              shortLink: false,
              status: "draft",
              posts: [],
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )) as unknown as typeof fetch

    const result = await getScheduledPosts(
      "2026-04-23T00:00:00.000Z",
      "2026-04-30T00:00:00.000Z",
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id).toBe("pst_123")
    expect(result.data[0]?.type).toBe("draft")
  })

  test("preserves array responses if upstream shape ever changes", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: "pst_456",
            type: "schedule",
            date: "2026-04-24T10:00:00.000Z",
            shortLink: false,
            status: "scheduled",
            posts: [],
          },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )) as unknown as typeof fetch

    const result = await getScheduledPosts(
      "2026-04-23T00:00:00.000Z",
      "2026-04-30T00:00:00.000Z",
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.id).toBe("pst_456")
    expect(result.data[0]?.status).toBe("scheduled")
  })
})

describe("postiz self-host base handling", () => {
  test("falls back to /api for Docker self-host app root URLs", async () => {
    const seen: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = input.toString()
      seen.push(new URL(url).pathname)
      if (url.includes("/api/public/v1/integrations")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ msg: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    }) as unknown as typeof fetch

    const result = await listIntegrations()

    expect(result.ok).toBe(true)
    expect(seen).toEqual([
      "/public/v1/integrations",
      "/api/public/v1/integrations",
    ])
  })

  test("does not double-prefix bases already ending in /api", async () => {
    process.env.POSTIZ_API_BASE = "http://localhost:4007/api"
    const seen: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      seen.push(new URL(input.toString()).pathname)
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as unknown as typeof fetch

    const result = await listIntegrations()

    expect(result.ok).toBe(true)
    expect(seen).toEqual(["/api/public/v1/integrations"])
  })
})

describe("diagnosePostiz", () => {
  test("reports missing key without calling the network", async () => {
    delete process.env.POSTIZ_API_KEY
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return new Response("{}")
    }) as unknown as typeof fetch

    const result = await diagnosePostiz()

    expect(result.configured).toBe(false)
    expect(result.checks[0]?.name).toBe("api-key")
    expect(result.checks[0]?.status).toBe("fail")
    expect(calls).toBe(0)
  })

  test("checks is-connected and integrations when configured", async () => {
    const seen: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const path = new URL(input.toString()).pathname
      seen.push(path)
      if (path.endsWith("/is-connected")) {
        return new Response(JSON.stringify({ connected: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response(
        JSON.stringify([{ id: "int-1", identifier: "x", name: "X", picture: "", disabled: false, profile: "acme" }]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )
    }) as unknown as typeof fetch

    const result = await diagnosePostiz()

    expect(result.configured).toBe(true)
    expect(result.checks.map((check) => check.name)).toEqual(["api-key", "connected", "integrations"])
    expect(result.providers).toHaveLength(1)
    expect(seen).toEqual(["/public/v1/is-connected", "/public/v1/integrations"])
  })
})
