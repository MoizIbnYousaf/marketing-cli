"use client"

import { m } from "framer-motion"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { SpikeBadge } from "@/components/workspace/signals/spike-badge"
import { PulseEmptyState } from "./empty-state"
import type { Signal } from "@/lib/types/pulse"

const PLATFORM_DOT: Record<string, string> = {
  instagram: "bg-pink-400",
  tiktok: "bg-cyan-400",
  news: "bg-slate-400",
  google_trends: "bg-violet-400",
  youtube: "bg-red-400",
}

export function SpikeStack({
  spikes,
  onSpikeClick,
}: {
  spikes: Signal[]
  onSpikeClick?: (signalId: string) => void
}) {
  // Defensive: the parent's SWR envelope unwrap is the source of truth, but
  // a stale dev build or a consumer that forgets `dataFetcher` can still
  // hand us the raw `{ok,data,meta}` envelope. Coerce before `.slice`.
  const items: Signal[] = Array.isArray(spikes) ? spikes : []
  const top3 = items.slice(0, 3)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-accent" />
        <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">Top Spikes</h3>
        {top3.length > 0 && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
            {top3.length}
          </span>
        )}
      </div>

      {top3.length === 0 ? (
        <PulseEmptyState
          icon={AlertTriangle}
          title="No spikes detected"
          description="Spikes appear when signals exceed 3x baseline"
        />
      ) : (
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {top3.map((signal) => {
            const dot = PLATFORM_DOT[signal.platform] ?? "bg-slate-400"
            const metrics = signal.metrics ?? {}
            const primaryMetric =
              signal.platform === "tiktok"
                ? metrics.views
                : signal.platform === "google_trends"
                  ? signal.trendInterest
                  : metrics.likes

            const handleClick = () => {
              if (signal.canonicalUrl) {
                window.open(signal.canonicalUrl, "_blank", "noopener,noreferrer")
              }
              onSpikeClick?.(signal.id)
            }

            return (
              <m.div
                key={signal.id}
                variants={staggerItem}
                onClick={handleClick}
                className={cn(
                  "group rounded-lg border bg-background px-3.5 py-3 cursor-pointer hover:border-accent/30 hover:bg-subtle/30 hover:shadow-sm transition-all",
                  "border-l-[3px] border-l-amber-400"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={cn("mt-1 size-2 rounded-full shrink-0", dot)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                        {signal.title || signal.content || "Untitled signal"}
                      </p>
                      {signal.authorHandle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          @{signal.authorHandle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <SpikeBadge
                      severity={signal.severity === "neutral" || signal.severity == null ? "watch" : (signal.severity as "p0" | "p1" | "watch" | "negative")}
                      multiplier={signal.spikeMultiplier ?? undefined}
                    />
                    {primaryMetric !== undefined && primaryMetric !== null && (
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {primaryMetric.toLocaleString()}
                      </span>
                    )}
                    {signal.canonicalUrl && (
                      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              </m.div>
            )
          })}
        </m.div>
      )}
    </div>
  )
}
