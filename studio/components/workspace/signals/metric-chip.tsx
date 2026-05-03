"use client"

import { cn } from "@/lib/utils"
import { DeltaBadge } from "./delta-badge"
import { Area, AreaChart, ReferenceLine, ResponsiveContainer } from "recharts"

function MiniSparkline({
  data,
  baseline,
}: {
  data: number[]
  baseline?: number
}) {
  const chartData = data.map((value, i) => ({ i, value }))

  return (
    <div className="size-[32px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a0733c" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a0733c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#a0733c"
            strokeWidth={1.5}
            fill="url(#sparkFill)"
            dot={false}
            isAnimationActive={false}
          />
          {baseline !== undefined && (
            <ReferenceLine
              y={baseline}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MetricChip({
  label,
  value,
  delta,
  baseline,
  sparklineData,
  className,
}: {
  label: string
  value: number
  delta?: number
  baseline?: number
  sparklineData?: number[]
  className?: string
}) {
  const formattedValue =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : value.toLocaleString()

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2",
        className
      )}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formattedValue}
          </span>
          {delta !== undefined && baseline !== undefined && (
            <DeltaBadge value={delta} baseline={baseline} />
          )}
        </div>
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <MiniSparkline data={sparklineData} baseline={baseline} />
      )}
    </div>
  )
}
