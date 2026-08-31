import { describe, expect, test } from "bun:test"
import {
  createWebMCPTools,
  registerWebMCPTools,
  WEBMCP_TOOL_NAMES,
  type WebMCPRequest,
} from "../../lib/webmcp"
import { boundToolResult } from "../../lib/webmcp/client"

function harness(options: { confirm?: boolean } = {}) {
  const calls: Array<{ path: string; method: string; body: unknown; signal: AbortSignal }> = []
  const navigations: string[] = []
  const request: WebMCPRequest = async (path, requestOptions) => {
    calls.push({
      path,
      method: requestOptions.method ?? "GET",
      body: requestOptions.body,
      signal: requestOptions.signal,
    })
    if (path.startsWith("/api/signals?")) {
      return { ok: true, data: Array.from({ length: 60 }, (_, id) => ({ id })) }
    }
    return { ok: true, data: { path } }
  }
  const tools = createWebMCPTools({
    request,
    confirm: () => options.confirm ?? false,
    navigate: async ({ view, skill }) => {
      const path = view === "skill" ? `/skills/${skill}` : `/${view}`
      navigations.push(path)
      return { ok: true, path }
    },
  })
  const execute = (name: string, input: Record<string, unknown> = {}) => {
    const tool = tools.find((candidate) => candidate.name === name)
    if (!tool) throw new Error(`Missing test tool: ${name}`)
    return tool.execute(input, { signal: new AbortController().signal })
  }
  return { calls, execute, navigations, tools }
}

describe("WebMCP Studio contract", () => {
  test("registers one unique, valid, curated definition per declared name", () => {
    const { tools } = harness()
    expect(tools.map((tool) => tool.name)).toEqual([...WEBMCP_TOOL_NAMES])
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length)
    expect(tools.length).toBe(20)
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/)
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.inputSchema).toMatchObject({ type: "object", additionalProperties: false })
      expect(tool.annotations?.untrustedContentHint).toBe(true)
    }
  })

  test("marks reads and actions honestly", () => {
    const { tools } = harness()
    const actionNames = new Set([
      "mktg.studio.navigate",
      "mktg.studio.signal.review",
      "mktg.studio.brand.update",
      "mktg.studio.content.update",
      "mktg.studio.skill.queue",
      "mktg.studio.foundation.start",
      "mktg.studio.publish.preview",
    ])
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(!actionNames.has(tool.name))
    }
  })

  test("registration uses AbortSignal lifecycle without cross-origin exposure", async () => {
    const { tools } = harness()
    const registrations: WebMCP.ModelContextRegisterToolOptions[] = []
    const modelContext = {
      registerTool: async (_tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
        registrations.push(options ?? {})
      },
    } as WebMCP.ModelContext
    const controller = new AbortController()

    const result = await registerWebMCPTools(modelContext, tools, controller.signal)

    expect(result).toEqual({ registered: tools.length, failed: [] })
    expect(registrations).toHaveLength(tools.length)
    expect(registrations.every((options) => options.signal === controller.signal)).toBe(true)
    expect(registrations.every((options) => options.exposedTo === undefined)).toBe(true)
  })

  test("origin-trial callbacks without execution options remain compatible", async () => {
    const { tools } = harness()
    const tool = tools.find(({ name }) => name === "mktg.studio.context")!
    const result = await (tool.execute as unknown as (
      input: Record<string, unknown>,
      options?: WebMCP.ToolExecuteCallbackOptions,
    ) => Promise<unknown>)({})
    expect(result).toMatchObject({ ok: true })
  })

  test("bounds signal reads before returning agent context", async () => {
    const { execute } = harness()
    const result = await execute("mktg.studio.signals.list", { limit: 7 })
    expect(result).toHaveLength(7)
  })

  test("executes every curated read tool with valid bounded input", async () => {
    const { execute } = harness()
    const inputs: Record<string, Record<string, unknown>> = {
      "mktg.studio.signals.list": { platform: "news", feedback: "pending", limit: 5 },
      "mktg.studio.brand.read": { file: "voice-profile.md" },
      "mktg.studio.content.read": { path: "marketing/draft.md" },
      "mktg.studio.skills.get": { name: "brand-voice" },
      "mktg.studio.publish.status": { view: "history", limit: 5 },
      "mktg.studio.activity": { limit: 5, kind: "skill" },
    }
    const readNames = WEBMCP_TOOL_NAMES.slice(0, 13)
    const results = await Promise.all(readNames.map((name) => execute(name, inputs[name] ?? {})))
    expect(results).toHaveLength(readNames.length)
    expect(results.every((result) => result !== undefined)).toBe(true)
  })

  test("executes every curated action with valid input", async () => {
    const { execute, navigations } = harness({ confirm: true })
    const actions: Array<[string, Record<string, unknown>]> = [
      ["mktg.studio.navigate", { view: "settings" }],
      ["mktg.studio.signal.review", { id: 1, action: "flag", reason: "irrelevant" }],
      ["mktg.studio.brand.update", { file: "audience.md", content: "# Audience", expectedMtime: "mtime" }],
      ["mktg.studio.content.update", { path: "marketing/draft.md", content: "Draft", expectedMtime: "mtime" }],
      ["mktg.studio.skill.queue", { name: "brand-voice" }],
      ["mktg.studio.foundation.start", { from: "https://example.com" }],
      ["mktg.studio.publish.preview", { adapter: "postiz", manifest: { items: [] } }],
    ]
    const results = await Promise.all(actions.map(([name, input]) => execute(name, input)))
    expect(results).toHaveLength(actions.length)
    expect(navigations).toEqual(["/settings"])
  })

  test("forwards execution cancellation to in-flight Studio requests", async () => {
    let observedSignal: AbortSignal | undefined
    const request: WebMCPRequest = (_path, { signal }) => {
      observedSignal = signal
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true })
      })
    }
    const controller = new AbortController()
    const [tool] = createWebMCPTools({
      request,
      confirm: () => true,
      navigate: async () => ({ ok: true, path: "/dashboard" }),
    })
    const execution = tool!.execute({}, { signal: controller.signal })
    controller.abort(new DOMException("Cancelled by caller", "AbortError"))

    await expect(execution).rejects.toMatchObject({ name: "AbortError" })
    expect(observedSignal).toBe(controller.signal)
    expect(observedSignal?.aborted).toBe(true)
  })

  test("declined persistent action performs no request", async () => {
    const { calls, execute } = harness({ confirm: false })
    const result = await execute("mktg.studio.signal.review", { id: 7, action: "approve" })
    expect(result).toMatchObject({ ok: false, cancelled: true })
    expect(calls).toHaveLength(0)
  })

  test("approved brand write preserves optimistic locking and cancellation signal", async () => {
    const { calls, execute } = harness({ confirm: true })
    await execute("mktg.studio.brand.update", {
      file: "voice-profile.md",
      content: "# Voice",
      expectedMtime: "2026-08-31T00:00:00.000Z",
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      path: "/api/brand/write",
      method: "POST",
      body: {
        file: "voice-profile.md",
        content: "# Voice",
        expectedMtime: "2026-08-31T00:00:00.000Z",
      },
    })
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  test("confirmed edits can intentionally clear an existing file", async () => {
    const { calls, execute } = harness({ confirm: true })
    await execute("mktg.studio.content.update", {
      path: "marketing/draft.md",
      content: "",
      expectedMtime: "2026-08-31T00:00:00.000Z",
    })
    expect(calls[0]).toMatchObject({
      path: "/api/cmo/content/file",
      method: "PUT",
      body: { path: "marketing/draft.md", content: "" },
    })
  })

  test("publish tool can only call the backend dry-run path", async () => {
    const { calls, execute } = harness({ confirm: true })
    await execute("mktg.studio.publish.preview", {
      adapter: "postiz",
      manifest: { campaign: "launch", items: [] },
    })
    expect(calls).toEqual([
      expect.objectContaining({
        path: "/api/publish?dryRun=true",
        method: "POST",
        body: {
          adapter: "postiz",
          manifest: { campaign: "launch", items: [] },
          confirm: false,
        },
      }),
    ])
  })

  test("redacts likely secrets and truncates oversized text", () => {
    const result = boundToolResult({
      apiKey: "top-secret",
      nested: { authorization: "Bearer abc", configured: true },
      content: "x".repeat(50_000),
    }) as Record<string, unknown>
    expect(result.apiKey).toBe("[REDACTED]")
    expect(result.nested).toEqual({ authorization: "[REDACTED]", configured: true })
    expect(String(result.content)).toContain("[TRUNCATED")
  })

  test("measures the result budget in UTF-8 bytes", () => {
    const multibyte = "🧪".repeat(20_000)
    const result = boundToolResult({ first: multibyte, second: multibyte })
    expect(result).toMatchObject({
      ok: false,
      error: { code: "RESULT_TOO_LARGE" },
    })
  })
})
