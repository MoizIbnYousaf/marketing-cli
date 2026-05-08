"use client"

import { useState } from "react"
import useSWR from "swr"
import { ExternalLink, PlugZap, RefreshCw, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import {
  getProviderMeta,
  type PublishIntegration,
} from "@/lib/types/publish"

type ApiResponse = {
  ok: true
  adapter?: string
  data: {
    id: string
    identifier: string
    name: string
    picture: string
    disabled: boolean
    profile: string
  }[]
  degraded?: boolean
  degradedReason?: string
}

const POSTIZ_BASE =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_POSTIZ_API_BASE ?? "https://api.postiz.com"
    : "https://api.postiz.com"

const NATIVE_PROVIDER_OPTIONS = [
  { identifier: "x", label: "X" },
  { identifier: "tiktok", label: "TikTok" },
  { identifier: "instagram", label: "Instagram" },
  { identifier: "reddit", label: "Reddit" },
  { identifier: "linkedin", label: "LinkedIn" },
] as const

export function ConnectedProviders({
  adapter = "postiz",
  selectedIntegrationIds,
  onToggle,
  className,
}: {
  adapter?: string
  selectedIntegrationIds: string[]
  onToggle: (integration: PublishIntegration) => void
  className?: string
}) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/publish/integrations?adapter=${adapter}`,
    fetcher,
    { refreshInterval: 60_000 },
  )
  const [creating, setCreating] = useState(false)
  const [identifier, setIdentifier] = useState<string>(NATIVE_PROVIDER_OPTIONS[0].identifier)
  const [name, setName] = useState("")
  const [profile, setProfile] = useState("")
  const [showNativeForm, setShowNativeForm] = useState(false)

  const integrations: PublishIntegration[] = (data?.data ?? []).map((i) => ({
    id: i.id,
    providerIdentifier: i.identifier,
    name: i.name,
    picture: i.picture,
    profile: i.profile,
    connected: !i.disabled,
  }))

  async function createNativeProvider() {
    if (adapter !== "mktg-native") return
    if (!identifier.trim() || !name.trim() || !profile.trim()) {
      toast.error("Fill identifier, name, and profile first.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/publish/native/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          name: name.trim(),
          profile: profile.trim().replace(/^@/, ""),
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error?.message ?? "Could not create provider")
        return
      }
      toast.success(`Connected ${name.trim()} to the native backend`)
      setIdentifier(NATIVE_PROVIDER_OPTIONS[0].identifier)
      setName("")
      setProfile("")
      setShowNativeForm(false)
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setCreating(false)
    }
  }

  const backendName = adapter === "mktg-native" ? "mktg-native" : "Postiz"
  const emptyDescription =
    adapter === "mktg-native"
      ? "Create a local provider and the native agent-first backend will manage drafts, queue state, and publish history here."
      : "Connect a social account in Postiz to start scheduling posts."

  return (
    <Card className={cn("gap-3 py-4", className)}>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <PlugZap className="size-4 text-accent" />
          <h3 className="text-sm font-semibold">Connected accounts</h3>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => mutate()}
          aria-label="Refresh integrations"
          title="Refresh"
        >
          <RefreshCw className="size-3" />
        </Button>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            level="section"
            error={error}
            onRetry={() => mutate()}
            title="Couldn't load providers"
          />
        ) : data?.degraded ? (
          <EmptyState
            icon={ShieldAlert}
            title={`${backendName} unavailable`}
            description={data.degradedReason ?? `Configure ${backendName} to connect accounts.`}
            action={adapter === "postiz" ? (
              <a
                href={`${POSTIZ_BASE}/launches`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                Set up Postiz <ExternalLink className="size-3" />
              </a>
            ) : undefined}
          />
        ) : integrations.length === 0 ? (
          <EmptyState
            icon={PlugZap}
            title="No accounts connected"
            description={emptyDescription}
            action={adapter === "postiz" ? (
              <a
                href={`${POSTIZ_BASE}/launches`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                Open Postiz <ExternalLink className="size-3" />
              </a>
            ) : undefined}
          />
        ) : (
          <ul className="space-y-1.5">
            {integrations.map((integration) => {
              const meta = getProviderMeta(integration.providerIdentifier)
              const selected = selectedIntegrationIds.includes(integration.id)
              return (
                <li key={integration.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(integration)}
                    disabled={!integration.connected}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md border px-2.5 py-2 text-left transition-all",
                      selected
                        ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                        : "border-border/70 hover:border-accent/30 hover:bg-muted/40",
                      !integration.connected && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <ProviderAvatar
                      picture={integration.picture}
                      label={integration.name}
                      providerColor={meta.color}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {integration.name || integration.profile}
                      </p>
                      <p className={cn("truncate text-[11px]", meta.color, "opacity-80")}>
                        {meta.label} · @{integration.profile}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        integration.connected
                          ? "bg-emerald-500"
                          : "bg-amber-500 animate-pulse",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border/60 px-4 pt-3">
        {adapter === "mktg-native" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Native providers are local-first records managed inside this workspace. Initial rollout supports only X, TikTok, Instagram, Reddit, and LinkedIn.
              </p>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowNativeForm((current) => !current)}
              >
                {showNativeForm ? "Hide" : "Add provider"}
              </Button>
            </div>

            {showNativeForm && (
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  aria-label="Native platform"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="h-10 rounded-md border border-border/70 bg-background px-3 text-sm"
                >
                  {NATIVE_PROVIDER_OPTIONS.map((option) => (
                    <option key={option.identifier} value={option.identifier}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Provider name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Acme LinkedIn"
                />
                <div className="flex gap-2 sm:col-span-1">
                  <Input
                    aria-label="Provider profile"
                    value={profile}
                    onChange={(event) => setProfile(event.target.value)}
                    placeholder="@acme"
                  />
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={createNativeProvider}
                    disabled={creating}
                    className="min-h-11 shrink-0"
                  >
                    {creating ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <a
            href={`${POSTIZ_BASE}/launches`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
          >
            Manage primary backend in Postiz <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  )
}

function ProviderAvatar({
  picture,
  label,
  providerColor,
}: {
  picture: string
  label: string
  providerColor: string
}) {
  if (picture) {
    return (
      <img
        src={picture}
        alt={label}
        className="size-8 rounded-full border border-border/70 object-cover"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = "none"
        }}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-bold",
        providerColor,
      )}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  )
}
