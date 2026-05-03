"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import { dataFetcher } from "@/lib/fetcher"
import { SectionError } from "../section-error"
import type { ArchetypeCardsData, Signal } from "@/lib/types/pulse"

export const ARCHETYPES = [
  {
    name: "Indie Founders",
    emoji: "\u{1F680}",
    keywords: ["indie", "founder", "solo", "bootstrap", "build in public", "saas"],
    pill: {
      active: "bg-blue-500/15 border-blue-400/40 text-blue-300 dark:text-blue-300 shadow-[0_0_16px_-4px] shadow-blue-500/30",
      badge: "bg-blue-500/20 text-blue-300",
    },
  },
  {
    name: "AI Tool Builders",
    emoji: "\u{1F916}",
    keywords: ["ai", "agent", "claude", "openai", "llm", "rag", "tooling"],
    pill: {
      active: "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 dark:text-emerald-300 shadow-[0_0_16px_-4px] shadow-emerald-500/30",
      badge: "bg-emerald-500/20 text-emerald-300",
    },
  },
  {
    name: "Growth Engineers",
    emoji: "\u{1F4C8}",
    keywords: ["growth", "marketing", "cro", "seo", "funnel", "analytics", "experiment"],
    pill: {
      active: "bg-amber-500/15 border-amber-400/40 text-amber-300 dark:text-amber-300 shadow-[0_0_16px_-4px] shadow-amber-500/30",
      badge: "bg-amber-500/20 text-amber-300",
    },
  },
  {
    name: "Creator Operators",
    emoji: "\u{270F}\u{FE0F}",
    keywords: ["creator", "content", "newsletter", "audience", "twitter", "linkedin", "thread"],
    pill: {
      active: "bg-purple-500/15 border-purple-400/40 text-purple-300 dark:text-purple-300 shadow-[0_0_16px_-4px] shadow-purple-500/30",
      badge: "bg-purple-500/20 text-purple-300",
    },
  },
] as const

export type ArchetypeName = (typeof ARCHETYPES)[number]["name"]

const INACTIVE_PILL =
  "bg-foreground/[0.03] border-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.06] hover:border-foreground/[0.12]"
const INACTIVE_BADGE = "bg-foreground/[0.06] text-muted-foreground"

export function ArchetypePulseCards({
  groupId,
  activeFilter,
  onFilterChange,
}: {
  groupId: string
  activeFilter: string | null
  onFilterChange: (name: string | null) => void
}) {
  const { data, error, mutate } = useSWR<ArchetypeCardsData>(
    `/api/pulse/archetype-cards?groupId=${groupId}`,
    dataFetcher
  )

  const signals: Signal[] = data?.signals ?? []

  if (error && !data) {
    return <SectionError error={error} onRetry={() => mutate()} label="Archetype counts unavailable" />
  }

  if (data === undefined) {
    return (
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 rounded-full bg-muted/30 animate-pulse"
            style={{ width: `${80 + i * 16}px` }}
          />
        ))}
      </div>
    )
  }

  const totalCount = signals.length

  const archetypeCounts = ARCHETYPES.map((arch) => {
    const count = signals.filter((s) =>
      arch.keywords.some(
        (kw) =>
          s.title?.toLowerCase().includes(kw) ||
          s.content?.toLowerCase().includes(kw) ||
          s.hashtags?.some((h) => h.toLowerCase().includes(kw))
      )
    ).length
    return { ...arch, count }
  })

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
      {/* All pill */}
      <m.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => onFilterChange(null)}
        className={cn(
          "shrink-0 flex items-center gap-2 h-8 px-3.5 rounded-full border text-[13px] font-medium cursor-pointer transition-all duration-200",
          activeFilter === null
            ? "bg-accent/15 border-accent/40 text-accent shadow-[0_0_16px_-4px] shadow-accent/30"
            : INACTIVE_PILL
        )}
      >
        <span>All</span>
        <span
          className={cn(
            "text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none",
            activeFilter === null ? "bg-accent/20 text-accent" : INACTIVE_BADGE
          )}
        >
          {totalCount}
        </span>
      </m.button>

      {/* Archetype pills */}
      {archetypeCounts.map((arch) => {
        const isActive = activeFilter === arch.name
        return (
          <m.button
            key={arch.name}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => onFilterChange(isActive ? null : arch.name)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full border text-[13px] cursor-pointer transition-all duration-200",
              isActive ? arch.pill.active : INACTIVE_PILL
            )}
          >
            <span className="text-sm leading-none">{arch.emoji}</span>
            <span className="font-medium whitespace-nowrap">{arch.name}</span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none",
                isActive ? arch.pill.badge : INACTIVE_BADGE
              )}
            >
              {arch.count}
            </span>
          </m.button>
        )
      })}
    </div>
  )
}
