"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function PulseEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-subtle/30 px-4 py-8 text-center",
        className
      )}
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground/70">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-[240px] text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
