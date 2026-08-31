"use client"

import { Bot, CheckCircle2, CircleAlert, CircleDashed } from "lucide-react"
import { useWebMCPStatus } from "@/lib/webmcp/status"

export function WebMCPSection() {
  const status = useWebMCPStatus()
  const active = status.state === "active"
  const Icon = active
    ? CheckCircle2
    : status.state === "checking"
      ? CircleDashed
      : CircleAlert

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
          <Bot className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">WebMCP</h2>
          <p className="text-xs text-muted-foreground">
            Structured Studio tools for browser agents, sharing the same visible workspace and safety rails.
          </p>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 p-4">
        <Icon
          className={`mt-0.5 size-4 shrink-0 ${active ? "text-emerald-600" : "text-muted-foreground"}`}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{statusCopy(status.state)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {active
              ? `${status.registered} of ${status.total} curated tools are registered. Persistent local changes require a human confirmation dialog; external publishing remains a preview-only tool.`
              : "Studio still works normally. WebMCP requires ChatGPT's supported in-app browser or Chrome 149+ with WebMCP enabled."}
          </p>
          {status.failed.length > 0 && status.failed.length < status.total ? (
            <p className="mt-2 font-mono text-[11px] text-amber-700">
              Registration failed: {status.failed.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function statusCopy(state: ReturnType<typeof useWebMCPStatus>["state"]): string {
  if (state === "active") return "Agent tools active"
  if (state === "checking") return "Checking browser support"
  if (state === "error") return "Tool registration failed"
  return "WebMCP unavailable in this browser"
}
