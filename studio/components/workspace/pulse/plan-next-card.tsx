"use client"

// PlanNextCard -- the "What to do next" card on Pulse, fed by
// GET /api/plan/next (`mktg plan next --json`). Renders nothing when the plan
// is empty, errored, or still loading, so MidSection keeps its snapshot
// heuristics as the fallback (see docs/tab-mapping.md).

import useSWR from "swr"
import { ChevronRight, Target } from "lucide-react"
import { dataFetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import type { PlanNextData, PlanTask } from "@/lib/types/mktg"

const CATEGORY_TONE: Record<PlanTask["category"], string> = {
  setup: "border-border bg-gradient-peach/25",
  populate: "border-border bg-gradient-mint/25",
  refresh: "border-border bg-gradient-sky/25",
  execute: "border-border bg-gradient-lavender/25",
  distribute: "border-border bg-gradient-rose/25",
}

export function usePlanNext() {
  const { data, error } = useSWR<PlanNextData>("/api/plan/next", dataFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: false,
  })
  const task = !error && data && data.task ? data.task : null
  return { task }
}

export function PlanNextCard({ task }: { task: PlanTask }) {
  const tone = CATEGORY_TONE[task.category] ?? CATEGORY_TONE.execute
  return (
    <div
      data-testid="plan-next-card"
      className={cn("group flex items-center gap-3 rounded-2xl border p-3.5", tone)}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card/70 text-foreground">
        <Target className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          What to do next · {task.category}
        </span>
        <span className="line-clamp-2 block break-words text-sm font-semibold text-foreground">{task.action}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{task.reason}</span>
        <code className="mt-1 block truncate text-[11px] text-muted-foreground/80">{task.command}</code>
      </span>
      <ChevronRight className="size-4 shrink-0 text-foreground" />
    </div>
  )
}
