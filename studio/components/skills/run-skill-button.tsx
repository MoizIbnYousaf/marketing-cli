"use client"

import { useState } from "react"
import { Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { studioAuthHeaders } from "@/lib/studio-token"
import { cn } from "@/lib/utils"

// Posts to /api/skill/run, the same endpoint the Command Palette uses.
// Lane 1 wraps that endpoint in Bearer middleware (Wave A); we pass the
// token via studioAuthHeaders() so a public install can't run skills
// without the launch-issued token.
export function RunSkillButton({
  name,
  disabled,
  className,
}: {
  name: string
  disabled?: boolean
  className?: string
}) {
  const [running, setRunning] = useState(false)

  async function run() {
    if (disabled || running) return
    setRunning(true)
    try {
      const res = await fetch("/api/skill/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...studioAuthHeaders() },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        const message = body?.error?.message ?? `${res.status} ${res.statusText}`
        toast.error(`Couldn't queue ${name}`, { description: message })
        return
      }
      toast.success(`Queued ${name}`, {
        description: "/cmo will pick it up. Watch the Activity panel for progress.",
      })
    } catch (err) {
      toast.error(`Couldn't queue ${name}`, {
        description: err instanceof Error ? err.message : "Network error",
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || running}
      aria-label={`Run ${name}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors",
        "hover:border-accent/40 hover:bg-accent/10 hover:text-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface-1 disabled:hover:text-muted-foreground",
        className,
      )}
    >
      {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
      {running ? "Running..." : "Run"}
    </button>
  )
}
