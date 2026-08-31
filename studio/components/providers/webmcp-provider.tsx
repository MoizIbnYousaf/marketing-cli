"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  createWebMCPTools,
  registerWebMCPTools,
  WEBMCP_TOOL_NAMES,
  type WebMCPNavigate,
} from "@/lib/webmcp"
import { studioWebMCPRequest } from "@/lib/webmcp/client"
import { setWebMCPStatus } from "@/lib/webmcp/status"

export function WebMCPProvider() {
  const router = useRouter()

  useEffect(() => {
    const controller = new AbortController()
    const modelContext = document.modelContext

    if (!modelContext) {
      setWebMCPStatus({
        state: "unsupported",
        registered: 0,
        total: WEBMCP_TOOL_NAMES.length,
        failed: [],
      })
      return () => controller.abort()
    }

    setWebMCPStatus({
      state: "checking",
      registered: 0,
      total: WEBMCP_TOOL_NAMES.length,
      failed: [],
    })

    const navigate: WebMCPNavigate = async (input) => {
      const path = studioPath(input)
      router.push(path)
      return { ok: true, path }
    }

    const register = async () => {
      try {
        // Do not expose tools until the HttpOnly Studio session has proven it
        // can reach an authenticated route. The token never enters JavaScript.
        await studioWebMCPRequest("/api/project/current", { signal: controller.signal })
        if (controller.signal.aborted) return

        const tools = createWebMCPTools({
          navigate,
          confirm: (message) => window.confirm(message),
        })
        const result = await registerWebMCPTools(modelContext, tools, controller.signal)
        if (controller.signal.aborted) return
        setWebMCPStatus({
          state: result.failed.length === tools.length ? "error" : "active",
          registered: result.registered,
          total: tools.length,
          failed: result.failed,
        })
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return
        setWebMCPStatus({
          state: "error",
          registered: 0,
          total: WEBMCP_TOOL_NAMES.length,
          failed: WEBMCP_TOOL_NAMES.slice(),
        })
      }
    }

    void register()
    return () => controller.abort()
  }, [router])

  return null
}

function studioPath(input: Parameters<WebMCPNavigate>[0]): string {
  if (input.view === "skills") return "/skills"
  if (input.view === "settings") return "/settings"
  if (input.view === "onboarding") return "/onboarding"
  if (input.view === "skill") {
    if (!input.skill || !/^[a-z0-9][a-z0-9-]*$/.test(input.skill)) {
      throw new Error("skill is required and must be a valid skill id when view is skill")
    }
    return `/skills/${encodeURIComponent(input.skill)}`
  }

  const query = new URLSearchParams()
  if (input.view !== "pulse") query.set("tab", input.view)
  if (input.view === "signals") {
    if (input.platform) query.set("platform", input.platform)
    if (input.stream) query.set("stream", input.stream)
    if (input.time) query.set("time", input.time)
  }
  const search = query.toString()
  return search ? `/dashboard?${search}` : "/dashboard"
}
