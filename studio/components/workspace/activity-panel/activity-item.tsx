"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Brain, FileText, Send, MessageSquare, Navigation, Sparkles } from "lucide-react"
import type { Activity, ActivityKind } from "@/lib/types/activity"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kindIcon(kind: ActivityKind) {
  switch (kind) {
    case "skill-run":
      return <Brain className="size-3.5 text-violet-500 shrink-0" />
    case "brand-write":
      return <FileText className="size-3.5 text-blue-500 shrink-0" />
    case "publish":
      return <Send className="size-3.5 text-emerald-500 shrink-0" />
    case "toast":
      return <MessageSquare className="size-3.5 text-amber-500 shrink-0" />
    case "navigate":
      return <Navigation className="size-3.5 text-sky-500 shrink-0" />
    case "custom":
    default:
      return <Sparkles className="size-3.5 text-pink-500 shrink-0" />
  }
}

function kindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "skill-run":   return "Skill"
    case "brand-write": return "Brand"
    case "publish":     return "Publish"
    case "toast":       return "Notice"
    case "navigate":    return "Nav"
    case "custom":
    default:            return "Event"
  }
}

function relativeTime(iso: string): string {
  // Server may return naïve "YYYY-MM-DD HH:MM:SS" (no Z) -- treat those as UTC
  // so client clock-skew can't yield negative diffs (-14244s ago bug).
  const normalized = iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`
  const ts = new Date(normalized).getTime()
  if (Number.isNaN(ts)) return "--"
  const diff = Math.max(0, Date.now() - ts)
  const s = Math.floor(diff / 1000)
  if (s < 5)   return "just now"
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ---------------------------------------------------------------------------
// ActivityItem
// ---------------------------------------------------------------------------

interface ActivityItemProps {
  activity: Activity
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = !!activity.detail
  const hasFiles = activity.filesChanged && activity.filesChanged.length > 0

  return (
    <div className="group border-b border-border/40 last:border-0">
      <button
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => (hasDetail || hasFiles) && setExpanded((v) => !v)}
        disabled={!hasDetail && !hasFiles}
      >
        {/* Icon */}
        <span className="mt-0.5">{kindIcon(activity.kind)}</span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {kindLabel(activity.kind)}
            </span>
            {activity.skill && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[120px]">
                  {activity.skill}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-foreground/90 leading-snug line-clamp-2">{activity.summary}</p>
        </div>

        {/* Right: time + chevron */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60">{relativeTime(activity.createdAt)}</span>
          {(hasDetail || hasFiles) && (
            expanded
              ? <ChevronUp className="size-3 text-muted-foreground/50" />
              : <ChevronDown className="size-3 text-muted-foreground/50" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {activity.detail && (
            <p className="text-xs text-muted-foreground leading-relaxed pl-6 whitespace-pre-wrap">
              {activity.detail}
            </p>
          )}
          {hasFiles && (
            <div className="pl-6 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Files changed</p>
              <ul className="space-y-0.5">
                {activity.filesChanged!.map((f) => (
                  <li
                    key={f}
                    className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
