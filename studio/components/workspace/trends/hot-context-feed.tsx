"use client"

import { Ban, Eye, Flame, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HotContextLane, HotContextFeedItem, HotContextActionInput } from "@/lib/types/trends"

export type { HotContextLane, HotContextFeedItem, HotContextActionInput }

const laneMeta: Record<
  HotContextLane,
  {
    title: string
    emptyCopy: string
    icon: typeof Flame
    laneClassName: string
    scoreClassName: string
  }
> = {
  act_now: {
    title: "Post Now",
    emptyCopy: "No urgent signals right now.",
    icon: Flame,
    laneClassName: "border-rose-500/20 bg-rose-500/[0.03]",
    scoreClassName: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  watch: {
    title: "Watch Closely",
    emptyCopy: "Nothing to monitor in this lane yet.",
    icon: Eye,
    laneClassName: "border-amber-500/20 bg-amber-500/[0.03]",
    scoreClassName: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  ignore: {
    title: "Ignore",
    emptyCopy: "No low-signal items yet.",
    icon: Ban,
    laneClassName: "border-slate-500/20 bg-slate-500/[0.03]",
    scoreClassName: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
}

const laneOrder: HotContextLane[] = ["act_now", "watch", "ignore"]

type HotContextFeedProps = {
  feed: HotContextFeedItem[] | undefined
  pendingSignalIds: ReadonlySet<string>
  onCreateAction: (input: HotContextActionInput) => Promise<void>
}

export function HotContextFeed({
  feed,
  pendingSignalIds,
  onCreateAction,
}: HotContextFeedProps) {
  const items = feed ?? []
  const lanes: Record<HotContextLane, HotContextFeedItem[]> = {
    act_now: [],
    watch: [],
    ignore: [],
  }

  for (const item of items) {
    lanes[item.lane].push(item)
  }

  const isLoading = feed === undefined

  return (
    <section className="rounded-xl border border-border/45 bg-muted/[0.16] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What To Act On
        </p>
        <Badge variant="outline" className="text-[10px]">
          {items.length} signal{items.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {laneOrder.map((laneKey) => {
          const meta = laneMeta[laneKey]
          const laneItems = lanes[laneKey]
          const Icon = meta.icon

          return (
            <div key={laneKey} className={cn("rounded-lg border p-3", meta.laneClassName)}>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Icon className="size-3.5" />
                  {meta.title}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {laneItems.length}
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-md bg-muted/45" />
                  <div className="h-16 animate-pulse rounded-md bg-muted/45" />
                </div>
              ) : laneItems.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/45 bg-background/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                  {meta.emptyCopy}
                </p>
              ) : (
                <div className="space-y-2">
                  {laneItems.map((item) => {
                    const isPending = pendingSignalIds.has(item.signalId)

                    return (
                      <article
                        key={item.signalId}
                        className="rounded-md border border-border/55 bg-background/65 p-2.5"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                            {item.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 text-[10px] tabular-nums", meta.scoreClassName)}
                          >
                            {Math.round(item.score)}
                          </Badge>
                        </div>

                        {item.whyNow.length > 0 && (
                          <ul className="mb-2 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                            {item.whyNow.slice(0, 3).map((bullet, idx) => (
                              <li key={`${item.signalId}-why-${idx}`} className="line-clamp-2">
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-full text-[11px]"
                          disabled={isPending}
                          onClick={() => {
                            if (isPending) return
                            void onCreateAction({
                              signalId: item.signalId,
                              lane: item.lane,
                              recommendedAction: item.recommendedAction,
                              whyNow: item.whyNow,
                            })
                          }}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Post Task"
                          )}
                        </Button>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
