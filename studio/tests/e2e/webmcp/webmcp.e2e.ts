import { expect, test, type Page } from "@playwright/test"

async function installWebMCPHarness(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, WebMCP.ModelContextTool>()
    const registrations: Array<{
      name: string
      annotations?: WebMCP.ToolAnnotations
      inputSchema?: object
      exposedTo?: string[]
    }> = []
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: async (
          tool: WebMCP.ModelContextTool,
          options?: WebMCP.ModelContextRegisterToolOptions,
        ) => {
          tools.set(tool.name, tool)
          registrations.push({
            name: tool.name,
            annotations: tool.annotations,
            inputSchema: tool.inputSchema,
            exposedTo: options?.exposedTo,
          })
        },
      },
    })
    Object.assign(window, { __webMCPTools: tools, __webMCPRegistrations: registrations })
  })
}

test.describe("WebMCP progressive enhancement", () => {
  test.beforeEach(async ({ page }) => {
    await installWebMCPHarness(page)
  })

  test("document is isolated and registers the complete same-origin tool contract", async ({ page }) => {
    const response = await page.goto("/dashboard")
    expect(response?.headers()["origin-agent-cluster"]).toBe("?1")
    expect(response?.headers()["permissions-policy"]).toBe("tools=(self)")
    expect(response?.headers()["x-frame-options"]).toBe("DENY")

    await expect.poll(() => page.evaluate(() => (
      (window as unknown as { __webMCPRegistrations: unknown[] }).__webMCPRegistrations.length
    ))).toBe(20)

    const registrations = await page.evaluate(() => (
      (window as unknown as {
        __webMCPRegistrations: Array<{
          name: string
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
          inputSchema?: { additionalProperties?: boolean }
          exposedTo?: string[]
        }>
      }).__webMCPRegistrations
    ))
    expect(new Set(registrations.map((tool) => tool.name)).size).toBe(20)
    expect(registrations.every((tool) => tool.exposedTo === undefined)).toBe(true)
    expect(registrations.every((tool) => tool.inputSchema?.additionalProperties === false)).toBe(true)
    expect(registrations.every((tool) => tool.annotations?.untrustedContentHint === true)).toBe(true)
  })

  test("agent can read live Studio state and navigate the visible UI", async ({ page }) => {
    await page.goto("/dashboard")
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as { __webMCPTools: Map<string, unknown> }).__webMCPTools.size
    ))).toBe(20)

    const context = await page.evaluate(async () => {
      const tools = (window as unknown as { __webMCPTools: Map<string, WebMCP.ModelContextTool> }).__webMCPTools
      return tools.get("mktg.studio.context")!.execute({}, { signal: new AbortController().signal })
    })
    expect(context).toMatchObject({ ok: true })

    await page.evaluate(async () => {
      const tools = (window as unknown as { __webMCPTools: Map<string, WebMCP.ModelContextTool> }).__webMCPTools
      await tools.get("mktg.studio.navigate")!.execute(
        { view: "settings" },
        { signal: new AbortController().signal },
      )
    })
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole("heading", { name: "WebMCP" })).toBeVisible()
    await expect(page.getByText("20 of 20 curated tools are registered.", { exact: false })).toBeVisible()
  })

  test("declined writes do nothing and publish remains dry-run only", async ({ page }) => {
    await page.goto("/dashboard")
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as { __webMCPTools: Map<string, unknown> }).__webMCPTools.size
    ))).toBe(20)

    const writeRequests: string[] = []
    page.on("request", (request) => {
      if (request.method() !== "GET") writeRequests.push(request.url())
    })
    const declined = await page.evaluate(async () => {
      window.confirm = () => false
      const tools = (window as unknown as { __webMCPTools: Map<string, WebMCP.ModelContextTool> }).__webMCPTools
      return tools.get("mktg.studio.brand.update")!.execute(
        { file: "voice-profile.md", content: "# Changed", expectedMtime: "stale" },
        { signal: new AbortController().signal },
      )
    })
    expect(declined).toMatchObject({ ok: false, cancelled: true })
    expect(writeRequests.some((url) => url.includes("/api/brand/write"))).toBe(false)

    const preview = await page.evaluate(async () => {
      const tools = (window as unknown as { __webMCPTools: Map<string, WebMCP.ModelContextTool> }).__webMCPTools
      return tools.get("mktg.studio.publish.preview")!.execute(
        { adapter: "postiz", manifest: { campaign: "challenge-demo", items: [] } },
        { signal: new AbortController().signal },
      )
    })
    expect(preview).toMatchObject({ ok: true, dryRun: true, adapter: "postiz" })
    expect(writeRequests.some((url) => url.includes("/api/publish?dryRun=true"))).toBe(true)
    expect(writeRequests.some((url) => /\/api\/publish(?:$|\?)(?!dryRun=true)/.test(url))).toBe(false)
  })
})

declare global {
  interface Window {
    __webMCPTools: Map<string, WebMCP.ModelContextTool>
    __webMCPRegistrations: unknown[]
  }
}
