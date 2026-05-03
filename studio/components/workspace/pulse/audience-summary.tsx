"use client"

import useSWR from "swr"
import { Users } from "lucide-react"
import { dataFetcher } from "@/lib/fetcher"
import type { AudienceProfile } from "@/lib/types/audience"

type AudienceResponse = {
  profiles: AudienceProfile[]
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

export function AudienceSummary({ groupId }: { groupId: string }) {
  const { data } = useSWR<AudienceResponse>(
    `/api/audience/profiles?groupId=${groupId}`,
    dataFetcher,
  )

  const profiles = Array.isArray(data?.profiles) ? data!.profiles : []
  if (profiles.length === 0) return null

  const topProfiles = profiles.slice(0, 3)

  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-accent" />
        <h3 className="text-sm font-semibold">Audience summary</h3>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {topProfiles.map((profile) => (
          <div
            key={`${profile.platform}:${profile.handle}`}
            className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {profile.platform}
            </div>
            <div className="mt-1 text-sm font-medium">@{profile.handle}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatNumber(profile.followers)} followers
              {typeof profile.engagementRate === "number"
                ? ` · ${profile.engagementRate.toFixed(1)}% engagement`
                : ""}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
