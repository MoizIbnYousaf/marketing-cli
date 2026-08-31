import { expect, test } from "@playwright/test"

const nativeBrowser = process.env.WEBMCP_NATIVE_CHROMIUM

test.describe("native WebMCP browser contract", () => {
  test.skip(!nativeBrowser, "Set WEBMCP_NATIVE_CHROMIUM to Chrome/Chromium 149+ with WebMCPTesting")

  test("discovers and executes Studio tools through document.modelContext", async ({ page }) => {
    const response = await page.goto("/dashboard")
    expect(response?.headers()["origin-agent-cluster"]).toBe("?1")
    expect(response?.headers()["permissions-policy"]).toBe("tools=(self)")

    const support = await page.evaluate(() => ({
      modelContext: typeof document.modelContext,
      originAgentCluster: window.originAgentCluster,
      secureContext: window.isSecureContext,
    }))
    expect(support).toEqual({
      modelContext: "object",
      originAgentCluster: true,
      secureContext: true,
    })

    await expect.poll(() => page.evaluate(async () => (
      (await (document.modelContext as NativeModelContext).getTools()).length
    ))).toBe(20)

    const definitions = await page.evaluate(async () => (
      (await (document.modelContext as NativeModelContext).getTools()).map((tool) => {
        const rawSchema = tool.inputSchema as unknown
        const schema = typeof rawSchema === "string"
          ? JSON.parse(rawSchema) as { additionalProperties?: boolean }
          : rawSchema as { additionalProperties?: boolean } | undefined
        return {
          name: tool.name,
          origin: tool.origin,
          readOnly: tool.annotations?.readOnlyHint,
          untrusted: tool.annotations?.untrustedContentHint,
          additionalProperties: schema?.additionalProperties,
        }
      })
    ))
    expect(new Set(definitions.map((tool) => tool.name)).size).toBe(20)
    expect(definitions.every((tool) => tool.origin === "http://127.0.0.1:4800")).toBe(true)
    expect(definitions.every((tool) => tool.untrusted === true)).toBe(true)
    expect(
      definitions
        .filter((tool) => tool.additionalProperties !== false)
        .map((tool) => tool.name),
    ).toEqual([])

    const context = await page.evaluate(async () => {
      const modelContext = document.modelContext as NativeModelContext
      const tool = (await modelContext.getTools()).find(({ name }) => name === "mktg.studio.context")!
      const result = await modelContext.executeTool(tool, "{}")
      return result === null ? null : JSON.parse(result)
    })
    expect(context).toMatchObject({ ok: true })
  })

  test("native execution preserves confirmation and dry-run boundaries", async ({ page }) => {
    await page.goto("/dashboard")
    await expect.poll(() => page.evaluate(async () => (
      (await (document.modelContext as NativeModelContext).getTools()).length
    ))).toBe(20)

    const writeRequests: string[] = []
    page.on("request", (request) => {
      if (request.method() !== "GET") writeRequests.push(request.url())
    })

    const declined = await page.evaluate(async () => {
      window.confirm = () => false
      const modelContext = document.modelContext as NativeModelContext
      const tool = (await modelContext.getTools()).find(({ name }) => name === "mktg.studio.brand.update")!
      const result = await modelContext.executeTool(tool, JSON.stringify({
        file: "voice-profile.md",
        content: "# Native write must not happen",
        expectedMtime: "stale",
      }))
      return result === null ? null : JSON.parse(result)
    })
    expect(declined).toMatchObject({ ok: false, cancelled: true })
    expect(writeRequests.some((url) => url.includes("/api/brand/write"))).toBe(false)

    const preview = await page.evaluate(async () => {
      const modelContext = document.modelContext as NativeModelContext
      const tool = (await modelContext.getTools()).find(({ name }) => name === "mktg.studio.publish.preview")!
      const result = await modelContext.executeTool(tool, JSON.stringify({
        adapter: "postiz",
        manifest: { campaign: "native-webmcp", items: [] },
      }))
      return result === null ? null : JSON.parse(result)
    })
    expect(preview).toMatchObject({ ok: true, dryRun: true, adapter: "postiz" })
    expect(writeRequests.some((url) => url.includes("/api/publish?dryRun=true"))).toBe(true)
    expect(writeRequests.some((url) => /\/api\/publish(?:$|\?)(?!dryRun=true)/.test(url))).toBe(false)
  })
})

interface NativeModelContext extends WebMCP.ModelContext {
  executeTool(
    tool: WebMCP.RegisteredTool,
    input?: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>
}
