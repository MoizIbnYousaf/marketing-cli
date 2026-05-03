"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function TabPageHeader({
  icon: Icon,
  iconColorClass,
  iconBgClass,
  title,
  children,
}: {
  icon: LucideIcon
  iconColorClass: string
  iconBgClass?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-xl border border-border/50",
            iconBgClass ?? "bg-accent/5"
          )}
        >
          <Icon className={cn("size-4.5", iconColorClass)} />
        </div>
        <div>
          <h2 className="font-serif text-lg tracking-tight text-foreground">
            {title}
          </h2>
          {children && (
            <div className="flex items-center gap-2 mt-0.5">{children}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TabPageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-9 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
    </div>
  )
}

/** Consistent middot separator matching the workspace tab style */
export function MetadataDot() {
  return <span className="text-border">&middot;</span>
}
