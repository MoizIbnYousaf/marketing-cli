"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ShieldAlert } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PulseEmptyState } from "@/components/workspace/pulse/empty-state"
import { getProviderMeta } from "@/lib/types/publish"

type ScheduledPost = {
  id: string
  date: string
  type: "draft" | "schedule" | "now" | "update"
  status?: string
  posts?: { integration: { identifier: string }; value: { content: string }[] }[]
}

type ApiResponse = {
  ok: true
  data: ScheduledPost[]
  degraded?: boolean
  degradedReason?: string
}

const DAY_MS = 86_400_000

export function CalendarView({
  adapter = "postiz",
  className,
}: {
  adapter?: string
  className?: string
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * DAY_MS), [weekStart])

  const startDate = weekStart.toISOString()
  const endDate = weekEnd.toISOString()

  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/publish/scheduled?adapter=${encodeURIComponent(adapter)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    fetcher,
    { refreshInterval: 120_000 },
  )

  const posts = data?.data ?? []

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart.getTime() + i * DAY_MS)
      const dayStart = day.getTime()
      const dayEnd = dayStart + DAY_MS
      return {
        date: day,
        posts: posts.filter((p) => {
          const t = new Date(p.date).getTime()
          return t >= dayStart && t < dayEnd
        }),
      }
    })
  }, [weekStart, posts])

  return (
    <Card className={cn("gap-3 py-4", className)} data-demo-id="publish-calendar">
      <div className="flex items-center justify-between px-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarIcon className="size-4 text-accent" />
          Week of {formatRange(weekStart, weekEnd)}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY_MS))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-3" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY_MS))}
            aria-label="Next week"
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>

      <div className="px-4">
        {error ? (
          <PulseEmptyState
            icon={ShieldAlert}
            title="Couldn't load calendar"
            description="The studio server may be down."
          />
        ) : data?.degraded ? (
          <PulseEmptyState
            icon={ShieldAlert}
            title={adapter === "mktg-native" ? "Native backend unavailable" : "Postiz unavailable"}
            description={
              data.degradedReason ??
              (adapter === "mktg-native"
                ? "Create a native provider to view scheduled posts."
                : "Set POSTIZ_API_KEY to view scheduled posts.")
            }
          />
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(({ date, posts: dayPosts }) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                posts={dayPosts}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function DayCell({
  date,
  posts,
  isLoading,
}: {
  date: Date
  posts: ScheduledPost[]
  isLoading: boolean
}) {
  const isToday = isSameDay(date, new Date())
  return (
    <div
      className={cn(
        "min-h-[110px] rounded-md border border-border/60 bg-background/50 p-1.5 transition-colors",
        isToday && "border-accent/40 bg-accent/5",
      )}
    >
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className={cn("font-semibold uppercase tracking-wide", isToday ? "text-accent" : "text-muted-foreground")}>
          {date.toLocaleDateString(undefined, { weekday: "short" })}
        </span>
        <span className={cn(isToday ? "text-accent" : "text-foreground/70", "font-medium")}>
          {date.getDate()}
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-1">
          <div className="h-3 animate-pulse rounded bg-muted/40" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted/40" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60">—</p>
      ) : (
        <ul className="space-y-1">
          {posts.slice(0, 3).map((post) => {
            const firstProvider = post.posts?.[0]?.integration?.identifier ?? "post"
            const meta = getProviderMeta(firstProvider)
            const content = post.posts?.[0]?.value?.[0]?.content ?? ""
            return (
              <li
                key={post.id}
                className="rounded-sm border border-border/60 bg-muted/30 px-1.5 py-1"
                title={content}
              >
                <p className={cn("truncate text-[10px] font-medium", meta.color)}>
                  {meta.label}
                </p>
                <p className="truncate text-[10px] text-foreground/70">
                  {content.slice(0, 32) || "(no content)"}
                </p>
              </li>
            )
          })}
          {posts.length > 3 && (
            <p className="text-[10px] text-muted-foreground">+{posts.length - 3} more</p>
          )}
        </ul>
      )}
    </div>
  )
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
  return monday
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString(undefined, opts)} – ${new Date(end.getTime() - 1).toLocaleDateString(undefined, opts)}`
}
