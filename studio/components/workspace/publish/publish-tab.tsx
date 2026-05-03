"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import { m } from "framer-motion"
import { Eye } from "lucide-react"
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animation/variants"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ConnectedProviders } from "./connected-providers"
import { PostComposer } from "./post-composer"
import { ProviderPreview } from "./provider-preview"
import { ScheduledQueue } from "./scheduled-queue"
import { CalendarView } from "./calendar-view"
import { RateLimitBadge } from "./rate-limit-badge"
import { PublishHistory } from "./publish-history"
import { XFormatBoard } from "./x-format-board"
import type { PublishIntegration } from "@/lib/types/publish"

type IntegrationsResponse = {
  ok: true
  adapter: string
  data: {
    id: string
    identifier: string
    name: string
    picture: string
    disabled: boolean
    profile: string
  }[]
  unavailable?: boolean
  error?: string
}

type HistoryResponse = {
  ok: true
  data: { createdAt: string; itemsPublished: number }[]
}

type NativeAccountResponse = {
  ok: true
  data: {
    account: { id: string; apiKeyPreview: string }
    providerCount: number
    postCount: number
  }
}

const ADAPTER = "postiz"
const DEFAULT_ADAPTER = "mktg-native"

export function PublishTab(_props: { groupId: string }) {
  const [adapter, setAdapter] = useState<string>(DEFAULT_ADAPTER)
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([])
  const [previewContent, setPreviewContent] = useState("")
  const [view, setView] = useState<"queue" | "calendar">("queue")

  const { data: integrationsData } = useSWR<IntegrationsResponse>(
    `/api/publish/integrations?adapter=${adapter}`,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const integrations: PublishIntegration[] = (integrationsData?.data ?? []).map((i) => ({
    id: i.id,
    providerIdentifier: i.identifier,
    name: i.name,
    picture: i.picture,
    profile: i.profile,
    connected: !i.disabled,
  }))

  const { data: historyData, mutate: mutateHistory } = useSWR<HistoryResponse>(
    "/api/publish/history?limit=50",
    fetcher,
    { refreshInterval: 60_000 },
  )
  const { data: nativeAccount } = useSWR<NativeAccountResponse>(
    adapter === "mktg-native" ? "/api/publish/native/account" : null,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const usedThisHour = computeUsedThisHour(historyData?.data ?? [])

  const handleToggleIntegration = useCallback(
    (integration: PublishIntegration) => {
      setSelectedIntegrationIds((prev) =>
        prev.includes(integration.id)
          ? prev.filter((id) => id !== integration.id)
          : [...prev, integration.id],
      )
    },
    [],
  )

  const selectedIntegrations = integrations.filter((i) =>
    selectedIntegrationIds.includes(i.id),
  )

  return (
    <m.div
      data-demo-id="publish-tab"
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className="p-4 lg:p-5 space-y-4 max-w-6xl mx-auto"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Publish</h1>
          <p className="text-xs text-muted-foreground">
            {adapter === "mktg-native"
              ? `Compose and route through the local agent-first backend with ${integrations.length} connected native account${integrations.length === 1 ? "" : "s"}.`
              : `Compose and schedule across ${integrations.length} connected account${integrations.length === 1 ? "" : "s"} via Postiz, the primary studio social backend. Typefully remains a specialist fallback outside this flow.`}
          </p>
          {adapter === "mktg-native" && nativeAccount?.data ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Workspace account <span className="font-mono text-foreground/80">{nativeAccount.data.account.id}</span>
              {" · "}
              key <span className="font-mono text-foreground/80">{nativeAccount.data.account.apiKeyPreview}</span>
              {" · "}
              {nativeAccount.data.providerCount} provider{nativeAccount.data.providerCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <RateLimitBadge used={usedThisHour} />
          <div
            role="radiogroup"
            aria-label="Publish backend"
            className="inline-flex rounded-md border border-border/70 bg-background/60 p-0.5 text-[11px] font-medium"
          >
            {[
              { value: "mktg-native", label: "Native" },
              { value: ADAPTER, label: "Postiz" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setAdapter(option.value)
                  setSelectedIntegrationIds([])
                }}
                role="radio"
                aria-checked={adapter === option.value}
                className={cn(
                  "min-h-11 min-w-16 rounded-[5px] px-3 py-1",
                  adapter === option.value
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Schedule view"
            className="inline-flex rounded-md border border-border/70 bg-background/60 p-0.5 text-[11px] font-medium"
          >
            <button
              onClick={() => setView("queue")}
              role="radio"
              aria-checked={view === "queue"}
              className={cn(
                // A19 / G2-03: 44x44 mobile tap target.
                "min-h-11 min-w-16 rounded-[5px] px-3 py-1",
                view === "queue"
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Queue
            </button>
            <button
              onClick={() => setView("calendar")}
              role="radio"
              aria-checked={view === "calendar"}
              className={cn(
                "min-h-11 min-w-16 rounded-[5px] px-3 py-1",
                view === "calendar"
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Calendar
            </button>
          </div>
        </div>
      </header>

      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 lg:grid-cols-[280px_1fr]"
      >
        <m.aside variants={staggerItem} className="space-y-4">
          <ConnectedProviders
            adapter={adapter}
            selectedIntegrationIds={selectedIntegrationIds}
            onToggle={handleToggleIntegration}
          />
        </m.aside>

        <m.div variants={staggerItem} className="space-y-4">
          <XFormatBoard
            adapter={adapter}
            integrations={integrations}
            selectedIntegrationIds={selectedIntegrationIds}
            onToggleIntegration={handleToggleIntegration}
            onPublished={() => void mutateHistory()}
          />

          <PostComposer
            adapter={adapter}
            integrations={integrations}
            selectedIntegrationIds={selectedIntegrationIds}
            onToggleIntegration={handleToggleIntegration}
            onContentChange={setPreviewContent}
          />

          {selectedIntegrations.length > 0 && (
            <Card className="gap-3 py-4">
              <div className="flex items-center gap-2 px-4">
                <Eye className="size-4 text-accent" />
                <h3 className="text-sm font-semibold">Per-provider preview</h3>
              </div>
              <div className="grid gap-2 px-4 sm:grid-cols-2">
                {selectedIntegrations.map((integration) => (
                  <ProviderPreview
                    key={integration.id}
                    integration={integration}
                    content={previewContent}
                  />
                ))}
              </div>
            </Card>
          )}

          {view === "queue" ? <ScheduledQueue adapter={adapter} /> : <CalendarView adapter={adapter} />}

          <PublishHistory />
        </m.div>
      </m.div>
    </m.div>
  )
}

function computeUsedThisHour(rows: { createdAt: string; itemsPublished: number }[]): number {
  const cutoff = Date.now() - 60 * 60 * 1000
  let used = 0
  for (const row of rows) {
    if (new Date(row.createdAt).getTime() >= cutoff) {
      used += row.itemsPublished
    }
  }
  return used
}
