"use client"

// PulseSparkline -- the funnel-ribbon sparkline used by the rebuilt Pulse hero.
// Reads a fixed-length PulseSeries from the snapshot envelope. Borrows the
// shape of components/workspace/signals/metric-chip.tsx::MiniSparkline but
// renders larger and exposes a `tone` so the four funnel nodes can color-code.
//
// When stardust ships ui/sparkline.tsx as a primitive, swap imports and
// delete this file. Recharts is gated behind nightowl's optimizePackageImports
// list, so this component can land on the home page without bundle regression.

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import type { PulseSeries, PulseActionTone } from "@/lib/types/pulse"
import { cn } from "@/lib/utils"

const TONE_STROKE: Record<PulseActionTone, string> = {
  green: "rgb(16 185 129)",
  blue: "rgb(56 189 248)",
  violet: "rgb(167 139 250)",
  amber: "rgb(251 191 36)",
}

export function PulseSparkline({
  series,
  tone,
  className,
}: {
  series: PulseSeries
  tone: PulseActionTone
  className?: string
}) {
  const data = series.map((value, i) => ({ i, value }))
  const stroke = TONE_STROKE[tone]
  const gradientId = `pulse-spark-${tone}`

  return (
    <div className={cn("h-10 w-full min-w-[80px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.6}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
