"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, Sparkles, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { dataFetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import type { SkillEntry, SkillCategory } from "@/lib/types/mktg"
import { RunSkillButton } from "./run-skill-button"

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  foundation: "Foundation",
  strategy: "Strategy",
  "copy-content": "Copy",
  distribution: "Distribution",
  creative: "Creative",
  conversion: "Conversion",
  seo: "SEO",
  growth: "Growth",
  knowledge: "Knowledge",
}

const CATEGORY_ORDER: SkillCategory[] = [
  "foundation",
  "strategy",
  "copy-content",
  "creative",
  "distribution",
  "conversion",
  "seo",
  "growth",
  "knowledge",
]

type CategoryFilter = SkillCategory | "all"

export function SkillList() {
  const { data, error, isLoading, mutate } = useSWR<SkillEntry[]>(
    "/api/skills",
    dataFetcher,
    { revalidateOnFocus: false },
  )

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const skills = data ?? []
  const totalInstalled = skills.filter((s) => s.installed).length

  const counts = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = { all: skills.length }
    for (const s of skills) {
      out[s.category] = (out[s.category] ?? 0) + 1
    }
    return out
  }, [skills])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return skills.filter((s) => {
      if (category !== "all" && s.category !== category) return false
      if (!q) return true
      if (s.name.toLowerCase().includes(q)) return true
      if (s.triggers.some((t) => t.toLowerCase().includes(q))) return true
      return false
    })
  }, [skills, query, category])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border bg-background/85 px-6 py-5 backdrop-blur">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading the marketing playbook..."
            : `${skills.length} skills in the playbook · ${totalInstalled} installed`}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or trigger..."
                aria-label="Search skills"
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div role="tablist" aria-label="Filter by category" className="flex flex-wrap items-center gap-1.5">
            <CategoryChip
              active={category === "all"}
              count={counts.all ?? 0}
              onClick={() => setCategory("all")}
            >
              All
            </CategoryChip>
            {CATEGORY_ORDER.filter((c) => (counts[c] ?? 0) > 0).map((c) => (
              <CategoryChip
                key={c}
                active={category === c}
                count={counts[c] ?? 0}
                onClick={() => setCategory(c)}
              >
                {CATEGORY_LABELS[c]}
              </CategoryChip>
            ))}
          </div>

          {error ? (
            <ErrorState
              error={error}
              level="tab"
              title="Couldn't load the skill catalog"
              onRetry={() => void mutate()}
            />
          ) : isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              variant="centered"
              title={query ? "No skills match your search" : "No skills found"}
              description={
                query
                  ? "Try a different keyword or clear the search."
                  : "The skill catalog returned no entries. Run mktg list to confirm the manifest."
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((skill) => (
                <SkillCard key={skill.name} skill={skill} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-border bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function SkillCard({ skill }: { skill: SkillEntry }) {
  const firstTrigger = skill.triggers[0] ?? null
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/skills/${skill.name}`}
            className="font-mono text-sm font-semibold text-foreground hover:text-accent"
          >
            {skill.name}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{CATEGORY_LABELS[skill.category]}</Badge>
            {skill.tier === "must-have" ? <Badge variant="default">core</Badge> : null}
            {skill.installed ? (
              <Badge variant="outline" className="text-emerald-300">
                installed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                not installed
              </Badge>
            )}
          </div>
        </div>
        <RunSkillButton name={skill.name} disabled={!skill.installed} />
      </div>

      {firstTrigger ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <BookOpen className="mr-1 inline size-3 align-[-1px]" />
          Triggers on &quot;{firstTrigger}&quot;
          {skill.triggers.length > 1 ? ` and ${skill.triggers.length - 1} more` : ""}
        </p>
      ) : null}
    </Card>
  )
}
