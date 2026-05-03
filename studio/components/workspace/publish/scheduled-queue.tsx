"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { CalendarClock, ImageIcon, RefreshCw, ShieldAlert } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PulseEmptyState } from "@/components/workspace/pulse/empty-state"
import { getProviderMeta } from "@/lib/types/publish"

type ScheduledPost = {
  id: string
  type: "draft" | "schedule" | "now" | "update"
  date: string
  status?: string
  posts?: {
    integration: { id: string; identifier: string }
    value: { content: string; mediaPaths?: string[] }[]
  }[]
}

type ApiResponse = {
  ok: true
  data: ScheduledPost[]
  degraded?: boolean
  degradedReason?: string
  postizErrorKind?: string
}

const RANGE_OPTIONS = [
  { id: "today", label: "Today", days: 1 },
  { id: "week", label: "This week", days: 7 },
  { id: "month", label: "This month", days: 30 },
] as const

type RangeId = (typeof RANGE_OPTIONS)[number]["id"]

export function ScheduledQueue({
  adapter = "postiz",
  className,
}: {
  adapter?: string
  className?: string
}) {
  const [range, setRange] = useState<RangeId>("week")

  const { startDate, endDate } = useMemo(() => {
    const days = RANGE_OPTIONS.find((o) => o.id === range)?.days ?? 7
    const now = new Date()
    return {
      startDate: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
      endDate: new Date(now.getTime() + days * 86_400_000).toISOString(),
    }
  }, [range])

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/publish/scheduled?adapter=${encodeURIComponent(adapter)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    fetcher,
    { refreshInterval: 90_000 },
  )

  const posts = data?.data ?? []

  return (
    <Card className={cn("gap-3 py-4", className)} data-demo-id="publish-scheduled">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-accent" />
          Scheduled queue
        </h3>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setRange(option.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                range === option.id
                  ? "bg-accent/12 text-accent"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => mutate()}
            aria-label="Refresh"
          >
            <RefreshCw className="size-3" />
          </Button>
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <PulseEmptyState
            icon={ShieldAlert}
            title="Couldn't load queue"
            description="The studio server may be down."
          />
        ) : data?.degraded ? (
          <PulseEmptyState
            icon={ShieldAlert}
            title={adapter === "mktg-native" ? "Native backend unavailable" : "Postiz unavailable"}
            description={
              data.degradedReason ??
              (adapter === "mktg-native"
                ? "Create a native account or provider to read the scheduled queue."
                : "Set POSTIZ_API_KEY to read the scheduled queue.")
            }
          />
        ) : posts.length === 0 ? (
          <PulseEmptyState
            icon={CalendarClock}
            title="No posts scheduled"
            description="Compose a post to add it to the queue."
          />
        ) : (
          <ul className="space-y-2">
            {posts.map((post) => (
              <ScheduledPostRow key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function ScheduledPostRow({ post }: { post: ScheduledPost }) {
  const firstPost = post.posts?.[0]
  const firstPart = firstPost?.value?.[0]
  const content = firstPart?.content ?? ""
  const mediaPaths = firstPart?.mediaPaths ?? []
  const previewProviders = (post.posts ?? []).map((p) => p.integration.identifier)
  const status = post.status ?? post.type

  const relative = useMemo(() => formatRelative(post.date), [post.date])

  return (
    <li className="rounded-md border border-border/70 bg-background/60 p-2.5 shadow-sm transition-colors hover:border-accent/30">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs leading-relaxed">
            {content || <span className="italic text-muted-foreground">(no content)</span>}
          </p>
          {mediaPaths.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mediaPaths.slice(0, 3).map((path) => (
                <a
                  key={path}
                  href={`/api/assets/file?path=${encodeURIComponent(path)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-lg border border-accent/25 bg-accent/10 transition-colors hover:bg-accent/15"
                >
                  {isImageAsset(path) ? (
                    <img
                      src={`/api/assets/file?path=${encodeURIComponent(path)}`}
                      alt={assetLabel(path)}
                      className="h-24 w-36 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-accent">
                    <ImageIcon className="size-3" />
                    {assetLabel(path)}
                  </span>
                </a>
              ))}
              {mediaPaths.length > 3 && (
                <span className="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground">
                  +{mediaPaths.length - 3} more
                </span>
              )}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <StatusChip status={status} />
            <span title={post.date}>{relative}</span>
            {previewProviders.length > 0 && (
              <span className="flex items-center gap-1">
                ·
                {previewProviders.map((p) => {
                  const meta = getProviderMeta(p)
                  return (
                    <span key={p} className={cn("font-medium", meta.color)}>
                      {meta.label}
                    </span>
                  )
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function assetLabel(path: string): string {
  return path.split("/").pop() || "media"
}

function isImageAsset(path: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(path)
}

function StatusChip({ status }: { status: string }) {
  const tone = statusTone(status)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone === "draft" && "border-muted text-muted-foreground",
        tone === "scheduled" && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        tone === "published" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "failed" && "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
      )}
    >
      {status}
    </span>
  )
}

function statusTone(status: string): "draft" | "scheduled" | "published" | "failed" {
  const s = status.toLowerCase()
  if (s.includes("publish")) return "published"
  if (s.includes("fail") || s.includes("error")) return "failed"
  if (s.includes("draft")) return "draft"
  return "scheduled"
}

function formatRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const mins = Math.round(abs / 60_000)
  const future = ms >= 0
  if (mins < 1) return future ? "in <1m" : "just now"
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return future ? `in ${hrs}h` : `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return future ? `in ${days}d` : `${days}d ago`
}
