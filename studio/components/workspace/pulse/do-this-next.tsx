"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { Zap, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { PulseEmptyState } from "./empty-state"
import { dataFetcher } from "@/lib/fetcher"
import { SectionError } from "../section-error"
import type { Brief } from "@/lib/types/pulse"

const URGENCY_CONFIG = {
  now: {
    label: "Now",
    className: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  },
  soon: {
    label: "Soon",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  watch: {
    label: "Watch",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  },
} as const

export function DoThisNext({ groupId }: { groupId: string }) {
  const { data: briefs, error, mutate } = useSWR<Brief[]>(
    `/api/pulse/decision-feed?groupId=${groupId}`,
    dataFetcher
  )

  // Find latest brief with contentOpportunities. Array.isArray guards
  // G4-65/66: the endpoint can return `{}` or `null` on fresh installs
  // before /cmo has produced a brief.
  const latestBrief = (Array.isArray(briefs) ? briefs : [])
    .filter((b) => b.status === "completed" && b.contentOpportunities?.length)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const opportunities = latestBrief?.contentOpportunities?.slice(0, 3) ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-accent" />
        <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">Do This Next</h3>
      </div>

      {error ? (
        <SectionError error={error} onRetry={() => mutate()} label="Decision feed unavailable" />
      ) : briefs === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <PulseEmptyState
          icon={Zap}
          title="No opportunities yet"
          description="Content opportunities appear after brief generation"
        />
      ) : (
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {opportunities.map((opp, i) => {
            const urgency = URGENCY_CONFIG[(opp.urgency ?? "watch") as keyof typeof URGENCY_CONFIG]

            return (
              <m.div
                key={i}
                variants={staggerItem}
                className="group rounded-lg border border-border bg-background px-3.5 py-3 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {opp.platform && (
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {opp.platform}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-bold py-0 px-1.5", urgency.className)}
                  >
                    {urgency.label}
                  </Badge>
                </div>
                <p className="text-[13px] font-serif leading-relaxed text-foreground/90 line-clamp-3">
                  {opp.hook}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Create Action
                  <ArrowRight className="size-3" />
                </div>
              </m.div>
            )
          })}
        </m.div>
      )}
    </div>
  )
}
