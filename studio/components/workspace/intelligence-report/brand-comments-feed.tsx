"use client"

import { m } from "framer-motion"
import { MessageCircle, ExternalLink, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { scaleIn, staggerItem } from "@/lib/animation/variants"
import { Badge } from "@/components/ui/badge"
import type { BrandComment } from "@/lib/types/briefs"

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "border-l-pink-400",
  tiktok: "border-l-rose-500",
}

const PLATFORM_BG: Record<string, string> = {
  instagram: "from-pink-500/5 to-transparent",
  tiktok: "from-rose-500/5 to-transparent",
}

export const BrandCommentsFeed = ({
  comments,
}: {
  comments: BrandComment[]
}) => (
  <m.div variants={scaleIn} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <MessageCircle className="size-3" />
      Fan Comments ({comments.length})
    </h3>
    <div className="space-y-2">
      {comments.slice(0, 5).map((comment, i) => (
        <m.div
          key={i}
          variants={staggerItem}
          className={cn(
            "rounded-lg border border-border border-l-2 p-3 bg-gradient-to-r",
            PLATFORM_COLORS[comment.platform] ?? "border-l-accent",
            PLATFORM_BG[comment.platform] ?? "from-transparent"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="outline" className="text-[10px] font-semibold h-4 px-1.5">
                  {comment.platform === "instagram" ? "IG" : "TikTok"}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  @{comment.author}
                </span>
              </div>
              <p className="text-xs font-serif italic text-foreground/80 leading-relaxed">
                &ldquo;{comment.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-2">
                {comment.timestamp && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(comment.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                {comment.postUrl && (
                  <a
                    href={comment.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all",
                      comment.platform === "instagram"
                        ? "bg-pink-500/15 text-pink-600 dark:text-pink-400 hover:bg-pink-500/25"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25"
                    )}
                  >
                    <ExternalLink className="size-2.5" />
                    View Post &rarr;
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <Heart className="size-3" />
              <span className="text-xs tabular-nums font-medium">
                {formatNumber(comment.likes)}
              </span>
            </div>
          </div>
        </m.div>
      ))}
    </div>
  </m.div>
)
