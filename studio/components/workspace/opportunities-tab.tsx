"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { m } from "framer-motion"
import { CheckCircle2, Clock3, Loader2, Zap } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { ContentOpportunities } from "./intelligence-report/content-opportunities"
import {
  TabPageHeader,
  TabPageHeaderSkeleton,
  MetadataDot,
} from "./tab-page-header"
import { TabErrorState } from "./tab-error-state"
import { RefreshChip } from "./refresh-chip"
import type {
  ActionStatus,
  ActionBoardItem,
  ContentOpportunity,
  WatchItem,
} from "@/lib/types/opportunities"

type OpportunitiesResponse = {
  opportunities: ContentOpportunity[]
  watchItems: WatchItem[]
  actions: ActionBoardItem[]
}

const ACTION_STATUS_ORDER: Record<ActionStatus, number> = {
  open: 0,
  in_progress: 2,
  completed: 3,
  dismissed: 4,
}

const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  dismissed: "Dismissed",
}

const ACTION_STATUS_BADGE_CLASS: Record<ActionStatus, string> = {
  open: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  dismissed: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
}

const STATUS_CONTROL_OPTIONS: ActionStatus[] = [
  "open",
  "in_progress",
  "completed",
  "dismissed",
]

const ALLOWED_STATUS_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  open: ["in_progress", "completed", "dismissed"],
  in_progress: ["open", "completed", "dismissed"],
  completed: [],
  dismissed: [],
}

export function OpportunitiesTab({ groupId }: { groupId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<OpportunitiesResponse>(
    `/api/opportunities?groupId=${groupId}`,
    fetcher
  )
  const [pendingStatusByActionId, setPendingStatusByActionId] = useState<
    Record<string, ActionStatus | undefined>
  >({})

  // G4-65 guard: destructure defaults only fire on `undefined`. When the
  // server returns `{ opportunities: null }` or similar, the default is
  // skipped and downstream iterators would crash. Narrow explicitly.
  const rawOpps = data?.opportunities
  const rawWatch = data?.watchItems
  const rawActions = data?.actions
  const opportunities = Array.isArray(rawOpps) ? rawOpps : []
  const watchItems = Array.isArray(rawWatch) ? rawWatch : []
  const actions = Array.isArray(rawActions) ? rawActions : []

  const actionBoardItems = useMemo(
    () =>
      [...actions].sort((a, b) => {
        const statusOrderDelta = ACTION_STATUS_ORDER[a.status] - ACTION_STATUS_ORDER[b.status]
        if (statusOrderDelta !== 0) return statusOrderDelta
        return b.updatedAt - a.updatedAt
      }),
    [actions]
  )

  if (error && !data) {
    return <TabErrorState error={error} onRetry={() => mutate()} title="Couldn't load opportunities" />
  }

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <TabPageHeaderSkeleton />
        <div>
          <Skeleton className="h-3 w-40 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-28 mb-3" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 rounded-md" />
            <Skeleton className="h-8 rounded-md" />
            <Skeleton className="h-8 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  const urgencyCounts = { now: 0, soon: 0, watch: 0 }
  for (const opp of opportunities) {
    const urgency = opp.urgency ?? "watch"
    if (urgency in urgencyCounts) {
      urgencyCounts[urgency as keyof typeof urgencyCounts]++
    }
  }

  const hasBriefOpportunities = opportunities.length > 0 || watchItems.length > 0
  const hasActionBoardItems = actionBoardItems.length > 0

  const handleStatusChange = async (actionId: string, status: ActionStatus) => {
    setPendingStatusByActionId((prev) => ({ ...prev, [actionId]: status }))
    try {
      await fetch(`/api/opportunities/action/${actionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error("Set action status failed:", err)
    } finally {
      setPendingStatusByActionId((prev) => {
        const next = { ...prev }
        delete next[actionId]
        return next
      })
    }
  }

  if (!hasBriefOpportunities && !hasActionBoardItems) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
          <Zap className="size-5 text-amber-500/40" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          No opportunities detected yet
        </p>
        <p className="text-xs text-muted-foreground">
          Run your agents to discover content opportunities and trends worth
          watching.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full min-h-0 w-full">
      <m.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="p-6 space-y-6 max-w-6xl mx-auto"
      >
        <m.div variants={staggerItem}>
          <TabPageHeader
            icon={Zap}
            iconColorClass="text-amber-600 dark:text-amber-400"
            iconBgClass="bg-amber-500/5"
            title="Opportunities"
          >
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {opportunities.length} opportunit
              {opportunities.length === 1 ? "y" : "ies"}
            </span>
            {watchItems.length > 0 && (
              <>
                <MetadataDot />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {watchItems.length} watching
                </span>
              </>
            )}
            {hasActionBoardItems && (
              <>
                <MetadataDot />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {actionBoardItems.length} action
                  {actionBoardItems.length === 1 ? "" : "s"}
                </span>
              </>
            )}
            {urgencyCounts.now > 0 && (
              <>
                <MetadataDot />
                <span className="text-[11px] font-medium text-red-600 dark:text-rose-400 tabular-nums">
                  {urgencyCounts.now} act now
                </span>
              </>
            )}
            {urgencyCounts.soon > 0 && (
              <>
                <MetadataDot />
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                  {urgencyCounts.soon} soon
                </span>
              </>
            )}
            <MetadataDot />
            <RefreshChip onClick={() => mutate()} loading={isValidating} />
          </TabPageHeader>
        </m.div>

        <m.div variants={staggerItem}>
          <ActionBoardSection
            items={actionBoardItems}
            isLoading={false}
            pendingStatusByActionId={pendingStatusByActionId}
            onStatusChange={handleStatusChange}
          />
        </m.div>

        {hasBriefOpportunities && (
          <m.div variants={staggerItem}>
            <ContentOpportunities
              opportunities={opportunities}
              watchItems={watchItems.length > 0 ? watchItems : undefined}
            />
          </m.div>
        )}
      </m.div>
      </ScrollArea>
    </div>
  )
}

function ActionBoardSection({
  items,
  isLoading,
  pendingStatusByActionId,
  onStatusChange,
}: {
  items: ActionBoardItem[]
  isLoading: boolean
  pendingStatusByActionId: Record<string, ActionStatus | undefined>
  onStatusChange: (actionId: string, status: ActionStatus) => Promise<void>
}) {
  return (
    <section
      data-demo-id="opportunities-board"
      className="rounded-xl border border-border/45 bg-muted/[0.16] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="size-3.5" />
          Action Board
        </div>
        <Badge variant="outline" className="text-[10px]">
          {items.length} item{items.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[92px] rounded-lg" />
          <Skeleton className="h-[92px] rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/45 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          No dispatched actions yet. Create one from Hot Context in Trends.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const pendingStatus = pendingStatusByActionId[item.id]
            return (
              <article
                key={item.id}
                className="rounded-lg border border-border/55 bg-background/65 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {item.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px]",
                      ACTION_STATUS_BADGE_CLASS[item.status]
                    )}
                  >
                    {ACTION_STATUS_LABELS[item.status]}
                  </Badge>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {item.owner && (
                    <span className="rounded border border-border/55 bg-muted/35 px-2 py-0.5">
                      {item.owner}
                    </span>
                  )}
                  {item.score !== undefined && (
                    <span className="rounded border border-border/55 bg-muted/35 px-2 py-0.5 tabular-nums">
                      score {Math.round(item.score)}
                    </span>
                  )}
                  {item.updatedAt > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUS_CONTROL_OPTIONS.map((nextStatus) => {
                    const isCurrent = item.status === nextStatus
                    const isPending = pendingStatus !== undefined
                    const isPendingCurrent = pendingStatus === nextStatus
                    const isAllowedTransition = ALLOWED_STATUS_TRANSITIONS[item.status].includes(nextStatus)
                    const isDisabled = isCurrent || isPending || !isAllowedTransition

                    return (
                      <Button
                        key={`${item.id}-${nextStatus}`}
                        variant={isCurrent ? "secondary" : "outline"}
                        size="xs"
                        className="h-6 text-[11px]"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return
                          void onStatusChange(item.id, nextStatus)
                        }}
                      >
                        {isPendingCurrent ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          ACTION_STATUS_LABELS[nextStatus]
                        )}
                      </Button>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
