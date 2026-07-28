"use client"

import useSWR from "swr"
import { ExternalLink, SearchX } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

type SeoStatus = {
  catalog: { configured: boolean; missingEnvs: string[] }
  readiness: "not_configured" | "mcp_client_only" | "api_ready" | "selfhost_ready"
  project: { projectId: string; domain: string; updatedAt: string } | null
  bindingCorrupt: boolean
  state: { rankSnapshots: number; hasBacklinkOverview: boolean; keywordsSyncAt: string | null }
  keywordPlan: "missing" | "template" | "populated"
  openUrl: string
}

const READINESS_COPY: Record<SeoStatus["readiness"], { label: string; tone: "ok" | "warn" | "muted" }> = {
  api_ready: { label: "API ready", tone: "ok" },
  selfhost_ready: { label: "Self-host ready", tone: "ok" },
  mcp_client_only: { label: "MCP only", tone: "warn" },
  not_configured: { label: "Not configured", tone: "muted" },
}

export function SeoReadinessCard() {
  const { data, error, isLoading } = useSWR<SeoStatus>("/api/seo/status", fetcher, { refreshInterval: 120_000 })

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-md bg-muted/40" />
  }
  if (error || !data) {
    return (
      <EmptyState
        icon={SearchX}
        title="SEO status unavailable"
        description="The mktg seo status bridge did not respond. Check that the CLI is installed."
      />
    )
  }

  const copy = READINESS_COPY[data.readiness]
  const lastSync = data.state.keywordsSyncAt ? new Date(data.state.keywordsSyncAt).toLocaleDateString() : "never"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            copy.tone === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            copy.tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            copy.tone === "muted" && "border-muted text-muted-foreground",
          )}
        >
          {copy.label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          plan: {data.keywordPlan}
        </span>
      </div>

      {data.bindingCorrupt ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-300">
          .seo/openseo.json is corrupt - inspect it manually, then relink with mktg seo link-project.
        </p>
      ) : data.project ? (
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p className="truncate">
            <span className="font-medium text-foreground">{data.project.domain}</span>
            {" · "}
            {data.project.projectId}
          </p>
          <p>
            keywords synced {lastSync}
            {data.state.rankSnapshots > 0 ? ` · ${data.state.rankSnapshots} rank snapshots` : ""}
            {data.state.hasBacklinkOverview ? " · backlink overview" : ""}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          No project linked yet. Run <code className="text-foreground">/openseo-project-setup</code> or{" "}
          <code className="text-foreground">mktg seo link-project</code>
          {data.catalog.missingEnvs.length > 0 ? ` · missing ${data.catalog.missingEnvs.join(", ")}` : ""}
        </p>
      )}

      <div>
        <Button size="sm" variant="outline" asChild>
          <a href={data.openUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
            Open OpenSEO
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
    </div>
  )
}
