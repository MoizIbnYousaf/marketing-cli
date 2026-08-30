"use client"

// PulseSparkline -- the funnel-ribbon sparkline used by the rebuilt Pulse hero.
// Reads a fixed-length PulseSeries from the snapshot envelope. Borrows the
// shape of components/workspace/signals/metric-chip.tsx::MiniSparkline but
// renders larger and exposes a `tone` so the four funnel nodes can color-code.
//
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
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = Math.max(max - min, 1)
  const points = data.map(({ i, value }) => ({
    x: 2 + (i / Math.max(data.length - 1, 1)) * 116,
    y: 36 - ((value - min) / range) * 32,
  }))
  const linePath = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ")
  const areaPath = `${linePath} L118 38 L2 38 Z`

  return (
    <div className={cn("h-10 w-full min-w-[80px]", className)}>
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 120 40"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
