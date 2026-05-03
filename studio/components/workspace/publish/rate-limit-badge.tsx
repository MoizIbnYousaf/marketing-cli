"use client"

import { useMemo } from "react"
import { AlertTriangle, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const POSTIZ_HOURLY_LIMIT = 30

export function RateLimitBadge({
  used,
  limit = POSTIZ_HOURLY_LIMIT,
  resetsAt,
  className,
}: {
  used: number
  limit?: number
  resetsAt?: string
  className?: string
}) {
  const ratio = limit === 0 ? 0 : used / limit
  const tone = useMemo(() => {
    if (ratio >= 1) return "danger"
    if (ratio >= 0.75) return "warn"
    return "ok"
  }, [ratio])

  const resetsLabel = useMemo(() => {
    if (!resetsAt) return null
    const ms = new Date(resetsAt).getTime() - Date.now()
    if (Number.isNaN(ms) || ms <= 0) return "now"
    const mins = Math.ceil(ms / 60_000)
    if (mins < 60) return `in ${mins}m`
    const hrs = Math.ceil(mins / 60)
    return `in ${hrs}h`
  }, [resetsAt])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          data-demo-id="publish-rate-limit"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
            tone === "ok" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
            tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            tone === "danger" && "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
            className,
          )}
        >
          {tone === "danger" ? (
            <AlertTriangle className="size-3.5" />
          ) : (
            <Gauge className="size-3.5" />
          )}
          <span>
            {used} / {limit}
          </span>
          <span className="opacity-70">posts·hr</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Postiz public API limit: {limit} POST /posts per hour, per org.
        {resetsLabel ? ` Window resets ${resetsLabel}.` : ""}
      </TooltipContent>
    </Tooltip>
  )
}
