"use client"

import type { ActivityKind } from "@/lib/types/activity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
          <Button
            key={k.value}
            type="button"
            variant={kind === k.value ? "default" : "outline"}
            size="xs"
            onClick={() => onKindChange(k.value as ActivityKind | "all")}
            className="h-7 px-2 text-[10px]"
          >
            {k.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Skill search */}
        <Input
          type="text"
          value={skill}
          onChange={(e) => onSkillChange(e.target.value)}
          placeholder="Filter by skill…"
          size="sm"
          className="flex-1 text-[11px]"
        />

        {/* Time window */}
        <div className="flex gap-0.5">
          {TIME_WINDOWS.map((t) => (
            <Button
              key={t.value}
              type="button"
              variant={timeWindow === t.value ? "default" : "ghost"}
              size="xs"
              onClick={() => onTimeWindowChange(t.value)}
              className="h-7 px-2 text-[10px]"
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
