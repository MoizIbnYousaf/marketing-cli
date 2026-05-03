"use client"

import { Heart, MessageCircle, Repeat2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getCharLimit,
  getProviderMeta,
  type PublishIntegration,
} from "@/lib/types/publish"

export function ProviderPreview({
  integration,
  content,
  className,
}: {
  integration: PublishIntegration
  content: string
  className?: string
}) {
  const meta = getProviderMeta(integration.providerIdentifier)
  const limit = getCharLimit(integration.providerIdentifier)
  const overflow = content.length > limit
  const visible = content.slice(0, limit)
  const truncated = content.slice(limit)

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-background/60 p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 pb-2">
        <Avatar src={integration.picture} label={integration.name || integration.profile} />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {integration.name || integration.profile}
          </p>
          <p className={cn("truncate text-[10px]", meta.color)}>
            {meta.label} · @{integration.profile}
          </p>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">just now</span>
      </div>

      <div className="whitespace-pre-wrap break-words rounded-md bg-muted/30 p-2 text-xs leading-relaxed">
        {visible || (
          <span className="text-muted-foreground italic">Start typing to preview…</span>
        )}
        {overflow && (
          <mark className="bg-red-500/20 text-red-700 dark:text-red-300 rounded-sm px-0.5">
            {truncated}
          </mark>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" /> 0
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3" /> 0
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="size-3" /> 0
          </span>
          <span className="inline-flex items-center gap-1">
            <Send className="size-3" /> 0
          </span>
        </div>
        <span
          className={cn(
            "font-medium",
            overflow ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
          )}
        >
          {content.length} / {limit}
        </span>
      </div>
    </div>
  )
}

function Avatar({ src, label }: { src: string; label: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className="size-7 rounded-full border border-border/70 object-cover"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = "none"
        }}
      />
    )
  }
  return (
    <div className="flex size-7 items-center justify-center rounded-full border border-border/70 bg-muted text-[11px] font-bold">
      {label.slice(0, 1).toUpperCase()}
    </div>
  )
}
