"use client"

import { m } from "framer-motion"
import { Target, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { scaleIn, staggerItem } from "@/lib/animation/variants"
import { Badge } from "@/components/ui/badge"
import type { ContentOpportunity, WatchItem } from "@/lib/types/opportunities"

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  now: { bg: "bg-rose-500/20", text: "text-red-600 dark:text-red-400", label: "Now" },
  soon: { bg: "bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", label: "Soon" },
  watch: { bg: "bg-slate-500/20", text: "text-slate-500 dark:text-slate-400", label: "Watch" },
}

export const ContentOpportunities = ({
  opportunities,
  watchItems,
}: {
  opportunities: ContentOpportunity[]
  watchItems?: WatchItem[]
}) => (
  <m.div variants={scaleIn} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Target className="size-3" />
      Content Opportunities ({opportunities.length})
    </h3>
    <div className="space-y-2">
      {opportunities.map((opp, i) => {
        const urgency = URGENCY_STYLES[opp.urgency ?? "watch"] ?? URGENCY_STYLES.watch
        return (
          <m.div
            key={i}
            variants={staggerItem}
            className="rounded-lg border border-border p-3 hover:border-accent/30 hover:shadow-sm transition-all"
          >
            <p className="text-sm font-medium leading-snug text-foreground mb-2">
              {opp.hook}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
              >
                {opp.archetype}
              </Badge>
              {opp.platform && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {opp.platform}
                </Badge>
              )}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  urgency.bg,
                  urgency.text
                )}
              >
                {urgency.label}
              </span>
            </div>
          </m.div>
        )
      })}
    </div>
    {watchItems && watchItems.length > 0 && (
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Eye className="size-3" />
          What to Watch
        </h4>
        <div className="space-y-1.5">
          {watchItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1 size-1.5 rounded-full bg-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{item.item}</p>
                {item.action && (
                  <p className="text-[11px] text-muted-foreground">{item.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </m.div>
)
