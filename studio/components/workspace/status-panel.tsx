"use client"

import { m } from "framer-motion"
import { Calendar, FileText, Globe, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/formatTime"
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animation/variants"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Brief } from "@/lib/types/briefs"

const STATUS_ICON = {
  completed: CheckCircle,
  generating: Loader2,
  failed: XCircle,
} as const

const STATUS_STYLE = {
  completed: "bg-accent/10 text-accent border-accent/20",
  generating: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/10 text-destructive border-red-500/30",
} as const

const BriefRow = ({
  brief,
  isSelected,
  onSelect,
}: {
  brief: Brief
  isSelected: boolean
  onSelect: () => void
}) => {
  const StatusIcon = STATUS_ICON[brief.status]

  return (
    <m.button
      variants={staggerItem}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-lg transition-colors",
        isSelected
          ? "bg-accent/8 border border-accent/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
    >
      {/* Date */}
      <div className="flex items-center gap-1.5 min-w-[90px]">
        <Calendar className="size-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium tabular-nums">
          {brief.date}
        </span>
      </div>

      {/* Articles */}
      <div className="flex items-center gap-1 min-w-[60px]">
        <FileText className="size-3 text-muted-foreground shrink-0" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {brief.totalArticles ?? "—"}
        </span>
      </div>

      {/* Sources */}
      <div className="flex items-center gap-1 min-w-[50px]">
        <Globe className="size-3 text-muted-foreground shrink-0" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {brief.totalSources ?? "—"}
        </span>
      </div>

      {/* Status */}
      <div className="ml-auto">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-[10px] h-5",
            STATUS_STYLE[brief.status]
          )}
        >
          <StatusIcon
            className={cn(
              "size-2.5",
              brief.status === "generating" && "animate-spin"
            )}
          />
          {brief.status}
        </Badge>
      </div>

      {/* Time ago */}
      <div className="flex items-center gap-1 min-w-[55px] justify-end">
        <Clock className="size-2.5 text-muted-foreground/50 shrink-0" />
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {timeAgo(brief._creationTime)}
        </span>
      </div>
    </m.button>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-2 p-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-5 w-16 ml-auto" />
      </div>
    ))}
  </div>
)

const EmptyState = () => (
  <m.div
    variants={fadeInUp}
    initial="hidden"
    animate="visible"
    className="flex flex-col items-center justify-center h-full text-center px-6 py-8"
  >
    <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 mb-3">
      <FileText className="size-5 text-muted-foreground/30" />
    </div>
    <p className="text-xs font-medium text-muted-foreground">
      No briefs yet
    </p>
    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
      Run the pipeline to generate your first brief.
    </p>
  </m.div>
)

export function StatusPanel({
  briefs,
  selectedBriefId,
  onSelectBrief,
  isLoading,
  className,
}: {
  briefs: Brief[] | undefined
  selectedBriefId: string | null
  onSelectBrief: (briefId: string) => void
  isLoading?: boolean
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="px-4 py-2.5 border-b border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Brief History
          </h3>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!briefs || briefs.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="px-4 py-2.5 border-b border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Brief History
          </h3>
        </div>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Brief History
        </h3>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {briefs.length} brief{briefs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-6 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
        <span className="min-w-[90px]">Date</span>
        <span className="min-w-[60px]">Articles</span>
        <span className="min-w-[50px]">Sources</span>
        <span className="ml-auto">Status</span>
        <span className="min-w-[55px] text-right">Age</span>
      </div>

      {/* Brief list */}
      <ScrollArea className="flex-1">
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-0.5 px-3 pb-3"
        >
          {briefs.map((brief) => (
            <BriefRow
              key={brief._id}
              brief={brief}
              isSelected={selectedBriefId === brief._id}
              onSelect={() => onSelectBrief(brief._id)}
            />
          ))}
        </m.div>
      </ScrollArea>
    </div>
  )
}
