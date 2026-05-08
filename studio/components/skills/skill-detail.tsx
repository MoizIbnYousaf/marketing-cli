"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, BookOpen, Layers, Tag, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { dataFetcher } from "@/lib/fetcher"
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

export function SkillDetail({ name }: { name: string }) {
  const { data, error, isLoading, mutate } = useSWR<SkillEntry>(
    `/api/skills/${encodeURIComponent(name)}`,
    dataFetcher,
    { revalidateOnFocus: false },
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border bg-background/85 px-6 py-5 backdrop-blur">
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          All skills
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{name}</h1>
            {!isLoading && data ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{CATEGORY_LABELS[data.category]}</Badge>
                <Badge variant="outline">{data.layer}</Badge>
                {data.tier === "must-have" ? <Badge variant="default">core</Badge> : null}
                {data.installed ? (
                  <Badge variant="outline" className="text-emerald-300">
                    installed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    not installed
                  </Badge>
                )}
                {data.installedVersion ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    v{data.installedVersion}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {data ? <RunSkillButton name={name} disabled={!data.installed} /> : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {error ? (
            <ErrorState
              error={error}
              level="tab"
              title="Couldn't load this skill"
              onRetry={() => void mutate()}
            />
          ) : isLoading || !data ? (
            <SkillDetailSkeleton />
          ) : (
            <>
              <Card className="gap-3 px-5 py-4">
                <SectionHeading icon={Zap}>Triggers</SectionHeading>
                {data.triggers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No triggers declared in skills-manifest.json.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.triggers.map((trigger) => (
                      <li
                        key={trigger}
                        className="rounded-md border border-border bg-surface-1 px-2.5 py-1.5 font-mono text-xs text-foreground"
                      >
                        {trigger}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {data.routing ? (
                <Card className="gap-3 px-5 py-4">
                  <SectionHeading icon={Layers}>Routing</SectionHeading>
                  <RoutingRow label="Precedence" value={data.routing.precedence} />
                  {data.routing.requires.length > 0 ? (
                    <RoutingChipList label="Requires" items={data.routing.requires} />
                  ) : null}
                  {data.routing.unlocks.length > 0 ? (
                    <RoutingChipList label="Unlocks" items={data.routing.unlocks} />
                  ) : null}
                </Card>
              ) : null}

              <Card className="gap-3 px-5 py-4">
                <SectionHeading icon={Tag}>Versions</SectionHeading>
                <RoutingRow
                  label="Installed"
                  value={data.installedVersion ?? "(not installed)"}
                />
                {data.latestVersion ? (
                  <RoutingRow label="Latest" value={data.latestVersion} />
                ) : null}
              </Card>

              <Card className="gap-3 px-5 py-4">
                <SectionHeading icon={BookOpen}>Source</SectionHeading>
                <p className="text-xs text-muted-foreground">
                  Skill markdown lives at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    skills/{name}/SKILL.md
                  </code>
                  . /cmo reads it on every routed request.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-accent" />
      <h2 className="text-sm font-semibold">{children}</h2>
    </div>
  )
}

function RoutingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}

function RoutingChipList({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Link
            key={item}
            href={`/skills/${item}`}
            className="rounded-md border border-border bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-accent/40 hover:text-accent"
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SkillDetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32 w-full rounded-card" />
      <Skeleton className="h-32 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
    </div>
  )
}
