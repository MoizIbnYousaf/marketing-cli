"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { Flame, MessageCircle, BarChart3, Newspaper, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { dataFetcher } from "@/lib/fetcher"
import { SectionError } from "../section-error"
import type { Brief } from "@/lib/types/pulse"

const PLATFORM_ACCENT: Record<string, { dot: string; label: string }> = {
  instagram: { dot: "bg-pink-600 dark:bg-pink-400", label: "Instagram" },
  tiktok: { dot: "bg-cyan-600 dark:bg-cyan-400", label: "TikTok" },
  news: { dot: "bg-slate-500 dark:bg-slate-400", label: "News" },
}

type IntelItem = {
  type: "comment" | "metric" | "story"
  platform: string
  text: string
  detail?: string
  url?: string
}

export function FreshIntel({ groupId, filterKeywords }: { groupId: string; filterKeywords?: string[] | null }) {
  const { data: briefs, error, mutate } = useSWR<Brief[]>(
    `/api/pulse/fresh-intel?groupId=${groupId}`,
    dataFetcher
  )

  if (error) {
    return <SectionError error={error} onRetry={() => mutate()} label="Fresh intel unavailable" />
  }
  // G4-66: fresh install returns an empty-but-shape-correct payload, and
  // some endpoint stubs return non-array shapes (`{}` / `null`). Guarding
  // with Array.isArray prevents "briefs is not iterable" from crashing the
  // entire HQ tab before /cmo has ever run.
  if (!Array.isArray(briefs) || briefs.length === 0) return null

  // Extract the most compelling findings across all briefs
  const items: IntelItem[] = []

  for (const brief of briefs) {
    for (const c of brief.brandComments?.slice(0, 3) ?? []) {
      items.push({
        type: "comment",
        platform: c.platform,
        text: c.text,
        detail: `@${c.author} · ${c.likes} likes`,
        url: c.postUrl ?? undefined,
      })
    }

    for (const p of brief.platformIntelligence?.slice(0, 3) ?? []) {
      items.push({
        type: "metric",
        platform: p.platform.toLowerCase(),
        text: p.insight,
        detail: p.metric ?? undefined,
        url: p.url ?? undefined,
      })
    }

    for (const s of brief.topStories?.slice(0, 2) ?? []) {
      items.push({
        type: "story",
        platform: "news",
        text: s.title,
        detail: s.source,
        url: s.url ?? undefined,
      })
    }
  }

  if (items.length === 0) return null

  const sorted = [
    ...items.filter((i) => i.type === "comment"),
    ...items.filter((i) => i.type === "metric"),
    ...items.filter((i) => i.type === "story"),
  ]

  const prioritized = (filterKeywords
    ? sorted.filter((item) => {
        const haystack = [item.text, item.detail].filter(Boolean).join(" ").toLowerCase()
        return filterKeywords.some((kw) => haystack.includes(kw))
      })
    : sorted
  ).slice(0, 6)

  const IconForType = {
    comment: MessageCircle,
    metric: BarChart3,
    story: Newspaper,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-accent" />
        <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">
          Fresh Intel
        </h3>
        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          from latest briefs
        </span>
      </div>

      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2"
      >
        {prioritized.map((item, i) => {
          const accent = PLATFORM_ACCENT[item.platform] ?? PLATFORM_ACCENT.news
          const Icon = IconForType[item.type]
          return (
            <m.div
              key={i}
              variants={staggerItem}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex gap-3 rounded-lg border border-border bg-background p-3 hover:border-accent/30 hover:bg-subtle/30 transition-colors group",
                  item.url ? "cursor-pointer" : "cursor-default",
                  item.type === "comment"
                    ? "border-l-2 border-l-pink-500/60"
                    : item.type === "metric"
                      ? "border-l-2 border-l-cyan-500/60"
                      : "border-l-2 border-l-slate-400/60"
                )}
                onClick={(e) => { if (!item.url) e.preventDefault() }}
              >
                <div className="shrink-0 mt-0.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md",
                      item.type === "comment"
                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                        : item.type === "metric"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                          : "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug text-foreground line-clamp-2",
                      item.type === "comment" && "font-serif italic text-foreground/90"
                    )}
                  >
                    {item.type === "comment" ? `\u201C${item.text}\u201D` : item.text}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn("size-1.5 rounded-full shrink-0", accent.dot)}
                    />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {item.detail ?? accent.label}
                    </span>
                    {item.url && (
                      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                </div>
              </a>
            </m.div>
          )
        })}
      </m.div>
    </div>
  )
}
