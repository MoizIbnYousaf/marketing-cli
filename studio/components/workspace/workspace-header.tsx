"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Settings,
  Loader2,
  Radar,
} from "lucide-react"
import { m } from "framer-motion"

import { cn } from "@/lib/utils"
import { fadeIn } from "@/lib/animation/variants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type AgentStatus = "deploying" | "active" | "paused" | "failed"

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    dotClass: "bg-accent animate-pulse",
    badgeClass: "bg-accent/10 text-accent border-accent/20",
  },
  paused: {
    label: "Paused",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  deploying: {
    label: "Deploying",
    dotClass: "bg-blue-500 animate-pulse",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-destructive",
    badgeClass: "bg-red-500/10 text-destructive border-red-500/30",
  },
}

export function WorkspaceHeader({
  agentId,
  name,
  status,
  keywords,
  isPipelineRunning,
  mode,
  platforms,
}: {
  agentId: string
  name: string
  status: AgentStatus
  keywords?: string[]
  isPipelineRunning?: boolean
  mode?: string
  platforms?: string[]
}) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pauseAgent = async (args: { agentId: string }) => {
    const res = await fetch("/api/agents/pause", { method: "POST", body: JSON.stringify(args) })
    return res.json()
  }

  const resumeAgent = async (args: { agentId: string }) => {
    const res = await fetch("/api/agents/resume", { method: "POST", body: JSON.stringify(args) })
    return res.json()
  }

  const deleteAgent = async (args: { agentId: string }) => {
    const res = await fetch("/api/agents/delete", { method: "POST", body: JSON.stringify(args) })
    return res.json()
  }

  const triggerAgentRun = async (args: { agentId: string }) => {
    const res = await fetch("/api/agents/run", { method: "POST", body: JSON.stringify(args) })
    return res.json()
  }

  useEffect(() => {
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current)
    }
  }, [])

  const handleRunNow = async () => {
    setIsRunning(true)
    try {
      await triggerAgentRun({ agentId })
    } catch (err) {
      console.error("Run failed:", err)
    } finally {
      // Keep spinner for 2s to let pipeline start
      runTimerRef.current = setTimeout(() => setIsRunning(false), 2000)
    }
  }

  const runDisabled = status !== "active" || isRunning || !!isPipelineRunning

  const config = STATUS_CONFIG[status]

  const handleToggleStatus = async () => {
    if (status === "active") {
      await pauseAgent({ agentId })
    } else if (status === "paused") {
      await resumeAgent({ agentId })
    }
  }

  const handleDelete = async () => {
    await deleteAgent({ agentId })
    router.push("/dashboard/agents")
  }

  return (
    <m.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm"
    >
      {/* Left: Back + Agent Info */}
      <div className="flex items-center gap-3 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => router.push("/dashboard/agents")}
              >
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to agents</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {name}
            </h1>
            {mode === "cultural" && (
              <Badge
                variant="outline"
                className="shrink-0 gap-1 text-[11px] font-semibold bg-accent/10 text-accent border-accent/25"
              >
                <Radar className="size-2.5" />
                Cultural Intel
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 gap-1.5 text-[11px] font-medium",
                config.badgeClass
              )}
            >
              <span className={cn("size-1.5 rounded-full", config.dotClass)} />
              {config.label}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {keywords && keywords.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {keywords.slice(0, 4).join(" \u00B7 ")}
                {keywords.length > 4 && ` +${keywords.length - 4}`}
              </p>
            )}
            {platforms && platforms.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground capitalize"
                  >
                    {p === "instagram" ? "IG" : p === "tiktok" ? "TT" : "News"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Run Now button */}
        <Button
          size="sm"
          className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent-dark shadow-sm"
          disabled={runDisabled}
          onClick={handleRunNow}
        >
          {isRunning || isPipelineRunning ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {isRunning || isPipelineRunning ? "Running..." : "Run Now"}
        </Button>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={handleToggleStatus}
              disabled={status !== "active" && status !== "paused"}
            >
              {status === "active" ? (
                <>
                  <Pause className="size-4 mr-2" />
                  Pause Agent
                </>
              ) : (
                <>
                  <Play className="size-4 mr-2" />
                  Resume Agent
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/agents/${agentId}/settings`)
              }
            >
              <Settings className="size-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </m.div>
  )
}
