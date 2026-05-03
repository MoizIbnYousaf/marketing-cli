"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { Sparkles } from "lucide-react"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { PulseEmptyState } from "./empty-state"
import { dataFetcher } from "@/lib/fetcher"
import { SectionError } from "../section-error"
import type { Brief } from "@/lib/types/pulse"

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 5)
}

export function WhatChanged({ groupId }: { groupId: string }) {
  const { data: briefs, error, mutate } = useSWR<Brief[]>(
    `/api/pulse/what-changed?groupId=${groupId}`,
    dataFetcher
  )

  // Find the most recent completed brief with an executiveSummary. Guard
  // against non-array shapes (G4-65/66): `briefs` may arrive as `{}` or
  // `null` from a stubbed endpoint before /cmo has ever written a brief.
  const latestBrief = (Array.isArray(briefs) ? briefs : [])
    .filter((b) => b.status === "completed" && b.executiveSummary)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const bullets = latestBrief ? splitIntoSentences(latestBrief.executiveSummary!) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">What Changed</h3>
      </div>

      {error ? (
        <SectionError error={error} onRetry={() => mutate()} label="What-changed failed" />
      ) : briefs === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-5 rounded bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : bullets.length === 0 ? (
        <PulseEmptyState
          icon={Sparkles}
          title="Waiting for intelligence"
          description="Run the engine to generate intelligence"
        />
      ) : (
        <m.ul
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {bullets.map((bullet, i) => (
            <m.li
              key={i}
              variants={staggerItem}
              className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/85"
            >
              <span className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0" />
              <span className="font-serif">{bullet}</span>
            </m.li>
          ))}
        </m.ul>
      )}

      {latestBrief && (
        <p className="text-[11px] text-muted-foreground">
          From: {latestBrief.agentName} &middot; {latestBrief.date}
        </p>
      )}
    </div>
  )
}
