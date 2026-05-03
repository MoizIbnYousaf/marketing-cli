"use client"

import type { ActivityKind } from "@/lib/types/activity"

const ALL_KINDS: Array<{ value: ActivityKind | "all"; label: string }> = [
  { value: "all",         label: "All" },
  { value: "skill-run",  label: "Skills" },
  { value: "brand-write",label: "Brand" },
  { value: "publish",    label: "Publish" },
  { value: "toast",      label: "Notices" },
  { value: "custom",     label: "Custom" },
]

const TIME_WINDOWS: Array<{ value: string; label: string }> = [
  { value: "1h",  label: "1h" },
  { value: "6h",  label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d",  label: "7d" },
  { value: "all", label: "All" },
]

interface ActivityFiltersProps {
  kind: ActivityKind | "all"
  onKindChange: (kind: ActivityKind | "all") => void
  skill: string
  onSkillChange: (skill: string) => void
  timeWindow: string
  onTimeWindowChange: (window: string) => void
}

export function ActivityFilters({
  kind,
  onKindChange,
  skill,
  onSkillChange,
  timeWindow,
  onTimeWindowChange,
}: ActivityFiltersProps) {
  return (
    <div className="px-3 py-2 space-y-2 border-b border-border/40">
      {/* Kind filter pills */}
      <div className="flex flex-wrap gap-1">
        {ALL_KINDS.map((k) => (
          <button
            key={k.value}
            onClick={() => onKindChange(k.value as ActivityKind | "all")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
              kind === k.value
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Skill search */}
        <input
          type="text"
          value={skill}
          onChange={(e) => onSkillChange(e.target.value)}
          placeholder="Filter by skill…"
          className="flex-1 text-[11px] bg-muted border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {/* Time window */}
        <div className="flex gap-0.5">
          {TIME_WINDOWS.map((t) => (
            <button
              key={t.value}
              onClick={() => onTimeWindowChange(t.value)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                timeWindow === t.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
