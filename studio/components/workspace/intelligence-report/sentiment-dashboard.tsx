"use client"

import { m } from "framer-motion"
import { scaleIn } from "@/lib/animation/variants"
import type { Brief } from "@/lib/types/briefs"

export const SentimentDashboard = ({
  sentiment,
}: {
  sentiment: Brief["sentiment"]
}) => {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral
  if (total === 0) return null

  const pPct = Math.round((sentiment.positive / total) * 100)
  const nPct = Math.round((sentiment.negative / total) * 100)
  const neuPct = 100 - pPct - nPct

  return (
    <m.div variants={scaleIn} className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sentiment
      </h3>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <m.div
          className="bg-emerald-500 rounded-l-full"
          initial={{ width: 0 }}
          animate={{ width: `${pPct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <m.div
          className="bg-slate-500"
          initial={{ width: 0 }}
          animate={{ width: `${neuPct}%` }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <m.div
          className="bg-rose-400 rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${nPct}%` }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          Positive {pPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-slate-500" />
          Neutral {neuPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-rose-400" />
          Negative {nPct}%
        </span>
      </div>
      {sentiment.summary && (
        <p className="text-xs text-muted-foreground/80 leading-relaxed">
          {sentiment.summary}
        </p>
      )}
    </m.div>
  )
}
