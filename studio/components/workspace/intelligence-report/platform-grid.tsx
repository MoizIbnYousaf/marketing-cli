"use client"

import { m } from "framer-motion"
import { Database } from "lucide-react"
import { scaleIn } from "@/lib/animation/variants"
import { PlatformCard } from "./platform-card"
import type { PlatformStat } from "@/lib/types/intelligence"

export const PlatformGrid = ({
  stats,
}: {
  stats: PlatformStat[] | undefined
}) => {
  if (!stats || stats.length === 0) return null

  const activeStats = stats.filter((s) => s.count > 0)
  if (activeStats.length === 0) return null

  return (
    <m.div variants={scaleIn} className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Database className="size-3" />
        Platform Intelligence ({activeStats.length} platforms)
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {activeStats.map((stat) => (
          <PlatformCard key={stat.platform} stat={stat} />
        ))}
      </div>
    </m.div>
  )
}
