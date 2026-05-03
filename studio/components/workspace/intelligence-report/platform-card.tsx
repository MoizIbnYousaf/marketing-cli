"use client"

import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import { scaleIn } from "@/lib/animation/variants"
import type { PlatformStat } from "@/lib/types/intelligence"

const PLATFORM_THEMES: Record<string, { accent: string; bg: string; label: string }> = {
  instagram: { accent: "text-pink-500", bg: "from-pink-500/5", label: "Instagram" },
  tiktok: { accent: "text-cyan-500", bg: "from-cyan-500/5", label: "TikTok" },
  youtube: { accent: "text-red-500", bg: "from-red-500/5", label: "YouTube" },
  news: { accent: "text-blue-500", bg: "from-blue-500/5", label: "News" },
  google_trends: { accent: "text-green-500", bg: "from-green-500/5", label: "Trends" },
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

export const PlatformCard = ({ stat }: { stat: PlatformStat }) => {
  const theme = PLATFORM_THEMES[stat.platform] ?? PLATFORM_THEMES.news
  if (stat.count === 0) return null

  const isGoogleTrends = stat.platform === "google_trends"

  return (
    <m.div
      variants={scaleIn}
      className={cn(
        "rounded-lg border border-border p-4 bg-gradient-to-br to-transparent hover:border-accent/30 hover:shadow-sm transition-all",
        theme.bg
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", theme.accent)}>
          {theme.label}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {stat.count} signals
        </span>
      </div>

      {isGoogleTrends ? (
        <div className="space-y-1">
          <p className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {stat.avgInterest}
          </p>
          <p className="text-[10px] text-muted-foreground">avg interest</p>
          {stat.risingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {stat.risingCount} rising
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {stat.totalViews > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{formatNumber(stat.totalViews)}</p>
              <p className="text-[10px] text-muted-foreground">views</p>
            </div>
          )}
          <div>
            <p className="text-lg font-bold tabular-nums text-foreground">{formatNumber(stat.totalLikes)}</p>
            <p className="text-[10px] text-muted-foreground">likes</p>
          </div>
          {stat.totalComments > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{formatNumber(stat.totalComments)}</p>
              <p className="text-[10px] text-muted-foreground">comments</p>
            </div>
          )}
          {stat.totalShares > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{formatNumber(stat.totalShares)}</p>
              <p className="text-[10px] text-muted-foreground">shares</p>
            </div>
          )}
        </div>
      )}
    </m.div>
  )
}
