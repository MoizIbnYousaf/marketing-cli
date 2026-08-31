import { createWebMCPActionTools, type WebMCPConfirm, type WebMCPNavigate } from "./action-tools"
import { studioWebMCPRequest, type WebMCPRequest } from "./client"
import { createWebMCPReadTools } from "./read-tools"

export interface CreateWebMCPToolsOptions {
  request?: WebMCPRequest
  navigate: WebMCPNavigate
  confirm: WebMCPConfirm
}

export function createWebMCPTools({
  request = studioWebMCPRequest,
  navigate,
  confirm,
}: CreateWebMCPToolsOptions): WebMCP.ModelContextTool[] {
  return [
    ...createWebMCPReadTools(request),
    ...createWebMCPActionTools(request, navigate, confirm),
  ]
}

export async function registerWebMCPTools(
  modelContext: WebMCP.ModelContext,
  tools: WebMCP.ModelContextTool[],
  signal: AbortSignal,
): Promise<{ registered: number; failed: string[] }> {
  const results = await Promise.allSettled(
    tools.map((tool) => modelContext.registerTool(tool, { signal })),
  )
  return {
    registered: results.filter((result) => result.status === "fulfilled").length,
    failed: results.flatMap((result, index) =>
      result.status === "rejected" ? [tools[index]?.name ?? `tool-${index}`] : []),
  }
}

export const WEBMCP_TOOL_NAMES = [
  "mktg.studio.context",
  "mktg.studio.pulse",
  "mktg.studio.signals.list",
  "mktg.studio.brand.files",
  "mktg.studio.brand.read",
  "mktg.studio.content.list",
  "mktg.studio.content.read",
  "mktg.studio.skills.list",
  "mktg.studio.skills.get",
  "mktg.studio.publish.status",
  "mktg.studio.settings.status",
  "mktg.studio.activity",
  "mktg.studio.onboarding.status",
  "mktg.studio.navigate",
  "mktg.studio.signal.review",
  "mktg.studio.brand.update",
  "mktg.studio.content.update",
  "mktg.studio.skill.queue",
  "mktg.studio.foundation.start",
  "mktg.studio.publish.preview",
] as const

export type { WebMCPConfirm, WebMCPNavigate, WebMCPRequest }
