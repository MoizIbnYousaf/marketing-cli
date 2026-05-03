"use client"

import { m } from "framer-motion"
import useSWR from "swr"
import { Activity } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { Badge } from "@/components/ui/badge"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { cn } from "@/lib/utils"

type Agent = {
  _id: string
  name: string
  agentType?: string
  status: string
  currentStep?: string
  isRunning?: boolean
}

const DIMENSION_LABELS: Record<string, string> = {
  trend: "Trend Scout",
  brand: "Brand Sentinel",
  audience: "Audience Analyst",
}

function AgentStatusRow({ agent }: { agent: Agent }) {
  const isRunning = agent.isRunning ?? false
  const label = DIMENSION_LABELS[agent.agentType ?? ""] ?? agent.name

  return (
    <m.div
      variants={staggerItem}
      className="flex items-center justify-between py-2"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            isRunning
              ? "bg-amber-500 animate-pulse"
              : agent.status === "active"
                ? "bg-emerald-500"
                : "bg-muted-foreground/30"
          )}
        />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-medium",
          isRunning
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            : agent.status === "active"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-muted text-muted-foreground"
        )}
      >
        {isRunning
          ? agent.currentStep ?? "Running"
          : agent.status === "active"
            ? "Idle"
            : agent.status}
      </Badge>
    </m.div>
  )
}

export function BrandStatusPanel({ agents }: { agents: Agent[] }) {
  // Sort agents in dimension order: trend → brand → audience
  const order = ["trend", "brand", "audience"]
  const sorted = [...agents].sort(
    (a, b) =>
      order.indexOf(a.agentType ?? "") - order.indexOf(b.agentType ?? "")
  )

  return (
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-border/50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline Status
        </h3>
      </div>
      <div className="divide-y divide-border/30">
        {sorted.map((agent) => (
          <AgentStatusRow key={agent._id} agent={agent} />
        ))}
      </div>
    </m.div>
  )
}
