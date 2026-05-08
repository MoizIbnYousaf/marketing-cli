"use client"

import useSWR from "swr"
import { CheckCircle2, History, RefreshCw, ShieldAlert, XCircle } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { publishErrorCopy } from "@/lib/publish-error"
import { getProviderMeta, type PublishHistoryRow } from "@/lib/types/publish"

type ApiResponse = {
  ok: true
  data: PublishHistoryRow[]
}

export function PublishHistory({ className }: { className?: string }) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/publish/history?limit=20",
    fetcher,
    { refreshInterval: 60_000 },
  )

  const rows = data?.data ?? []

  return (
    <Card className={cn("gap-3 py-4", className)} data-demo-id="publish-history">
      <div className="flex items-center justify-between px-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-accent" />
          Recent publishes
        </h3>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => mutate()}
          aria-label="Refresh history"
        >
          <RefreshCw className="size-3" />
        </Button>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          (() => {
            const copy = publishErrorCopy(error, "history")
            return (
              <EmptyState
                icon={ShieldAlert}
                title={copy.title}
                description={copy.description}
                action={
                  copy.hint ? (
                    <p className="text-[11px] text-muted-foreground/80">{copy.hint}</p>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => mutate()}>
                      Retry
                    </Button>
                  )
                }
              />
            )
          })()
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No posts published yet"
            description="History fills as you publish."
          />
        ) : (
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function HistoryRow({ row }: { row: PublishHistoryRow }) {
  const ok = row.itemsFailed === 0
  const preview = normalizePreview(row.contentPreview)
  return (
    <li className="rounded-md border border-border/70 bg-background/60 p-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs leading-relaxed">
            {preview || (
              <span className="italic text-muted-foreground">(no preview)</span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="font-medium uppercase">{row.adapter}</span>
            <span>·</span>
            <span>{formatTimestamp(row.createdAt)}</span>
            {row.providers.length > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {row.providers.map((p) => {
                    const meta = getProviderMeta(p)
                    return (
                      <span key={p} className={cn("font-medium", meta.color)}>
                        {meta.label}
                      </span>
                    )
                  })}
                </span>
              </>
            )}
            <span className="ml-auto">
              <span className="text-emerald-600 dark:text-emerald-400">
                {row.itemsPublished} ok
              </span>
              {row.itemsFailed > 0 && (
                <span className="ml-1 text-red-600 dark:text-red-400">
                  · {row.itemsFailed} failed
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </li>
  )
}

function normalizePreview(value: string): string {
  return value
    .replace(/^demo:\s*/i, "")
    .trim()
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const ms = now - date.getTime()
  const mins = Math.round(ms / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
