"use client"

import { m } from "framer-motion"
import { Users, CheckCircle2, ExternalLink } from "lucide-react"
import { scaleIn, staggerItem } from "@/lib/animation/variants"
import type { AudienceProfile } from "@/lib/types/audience"

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

export const AudienceProfiles = ({
  profiles,
}: {
  profiles: AudienceProfile[]
}) => (
  <m.div variants={scaleIn} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Users className="size-3" />
      Audience Profiles ({profiles.length})
    </h3>
    <div className="grid grid-cols-2 gap-2">
      {profiles.map((profile, i) => (
        <m.div
          key={i}
          variants={staggerItem}
          className="rounded-lg border border-border p-4 hover:border-accent/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {profile.platform}
            </span>
            {profile.verified && (
              <CheckCircle2 className="size-3 text-accent" />
            )}
          </div>
          <a
            href={
              profile.platform === "instagram"
                ? `https://instagram.com/${profile.handle}`
                : `https://tiktok.com/@${profile.handle}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-accent hover:underline underline-offset-2 mb-2 block"
          >
            @{profile.handle}
          </a>
          <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight leading-none">
            {formatNumber(profile.followers)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">followers</p>
          {profile.engagementRate !== undefined && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {profile.engagementRate.toFixed(1)}% engagement
              </span>
            </div>
          )}
          {profile.bio && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <span>{formatNumber(profile.posts)} posts</span>
            <span>{formatNumber(profile.following)} following</span>
          </div>
          <a
            href={
              profile.platform === "instagram"
                ? `https://instagram.com/${profile.handle}`
                : `https://tiktok.com/@${profile.handle}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2.5 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 hover:border-accent/40 transition-all"
          >
            <ExternalLink className="size-3" />
            View @{profile.handle} &rarr;
          </a>
        </m.div>
      ))}
    </div>
  </m.div>
)
