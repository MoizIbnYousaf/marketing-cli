"use client"

import useSWR from "swr"
import { CheckCircle2, Plug, RefreshCw, ExternalLink, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { extractErrorMessage } from "@/lib/api-error"
import { resolveStudioApiBase } from "@/lib/studio-api-base"

interface PostizIntegration {
  id?: string
  identifier?: string
  name?: string
  providerIdentifier?: string
  picture?: { path?: string } | null
  disabled?: boolean
}

interface IntegrationsResponse {
  ok: boolean
  adapter?: string
  data?: PostizIntegration[]
  unavailable?: boolean
  error?: unknown
}

interface CatalogEntry {
  name?: string
  configured?: boolean
  healthy?: boolean
  missing_envs?: string[]
  capabilities?: string[]
  error?: string | null
}

interface CatalogStatusResponse {
  ok: boolean
  data?: CatalogEntry[]
  error?: unknown
}

interface PostizDiagnosticsResponse {
  ok: boolean
  data?: {
    configured: boolean
    base: string
    checks: Array<{
      name: "api-key" | "connected" | "integrations"
      status: "pass" | "fail" | "warn"
      detail: string
    }>
    providers: PostizIntegration[]
  }
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

export function IntegrationsSection() {
  const STUDIO_API_BASE = resolveStudioApiBase()
  const {
    data: integrations,
    isLoading: loadingIntegrations,
    mutate: refetchIntegrations,
  } = useSWR<IntegrationsResponse>(
    `${STUDIO_API_BASE}/api/publish/integrations?adapter=postiz`,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const {
    data: catalogStatus,
    isLoading: loadingCatalog,
    mutate: refetchCatalog,
  } = useSWR<CatalogStatusResponse>(
    `${STUDIO_API_BASE}/api/catalog/status`,
    fetcher,
    { refreshInterval: 120_000 },
  )

  const {
    data: postizDiagnostics,
    isLoading: loadingDiagnostics,
    mutate: refetchDiagnostics,
  } = useSWR<PostizDiagnosticsResponse>(
    `${STUDIO_API_BASE}/api/publish/postiz/diagnostics`,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const providers = integrations?.data ?? []
  const diagnostics = postizDiagnostics?.data
  const unavailable = integrations?.unavailable === true
  const catalogEntries = catalogStatus?.data ?? []
  const integrationsErrorMsg = unavailable ? extractErrorMessage(integrations, "Postiz unavailable") : null

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
          <Plug className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Connected providers</h2>
          <p className="text-xs text-muted-foreground">
            Postiz is the primary social backend here. Typefully remains a separate specialist fallback configured via API key only.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchIntegrations()
            refetchCatalog()
            refetchDiagnostics()
          }}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </header>

      <div className="space-y-5">
        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">Postiz connection</h3>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {diagnostics?.base ?? "POSTIZ_API_BASE not checked yet"}
              </p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
              diagnostics?.configured
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}>
              {loadingDiagnostics ? "Checking" : diagnostics?.configured ? "Ready" : "Needs setup"}
            </span>
          </div>

          {loadingDiagnostics ? (
            <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
          ) : diagnostics ? (
            <ul className="space-y-2">
              {diagnostics.checks.map((check) => {
                const healthy = check.status === "pass"
                return (
                  <li key={check.name} className="flex gap-2 rounded-lg border border-border/40 bg-background/80 px-3 py-2">
                    {healthy ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                    )}
                    <div>
                      <p className="text-xs font-medium capitalize">{check.name.replace("-", " ")}</p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              Diagnostics unavailable. Refresh after saving Postiz settings.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Postiz providers</h3>
            <span className="text-[11px] text-muted-foreground">
              {loadingIntegrations
                ? "Checking…"
                : `${providers.length} connected`}
            </span>
          </div>

          {loadingIntegrations ? (
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </ul>
          ) : unavailable || providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {unavailable
                  ? "Postiz adapter unavailable — set POSTIZ_API_KEY above."
                  : "No providers connected yet."}
              </p>
              {integrationsErrorMsg && (
                <p className="mt-1 font-mono text-[11px] text-rose-500/80">{integrationsErrorMsg}</p>
              )}
              <a
                href="https://api.postiz.com"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline"
              >
                Connect at postiz <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <ul className="space-y-1">
              {providers.map((p) => {
                const id = p.id ?? p.identifier ?? p.providerIdentifier ?? "unknown"
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${p.disabled ? "bg-amber-500" : "bg-emerald-500"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{p.name ?? id}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.providerIdentifier ?? p.identifier ?? id}
                        </p>
                      </div>
                    </div>
                    {p.disabled && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600">
                        Disabled
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Upstream catalogs</h3>
            <span className="text-[11px] text-muted-foreground">
              {loadingCatalog ? "Checking…" : `${catalogEntries.length} tracked`}
            </span>
          </div>

          {loadingCatalog ? (
            <ul className="space-y-2">
              {[0, 1].map((i) => (
                <li key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </ul>
          ) : catalogEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              No catalogs in this project. Add one via{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mktg catalog add</code>.
            </p>
          ) : (
            <ul className="space-y-1">
              {catalogEntries.map((c) => {
                const configured = c.configured === true
                const missing = c.missing_envs ?? []
                return (
                  <li
                    key={c.name ?? Math.random()}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background/80 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${configured ? "bg-emerald-500" : "bg-rose-500/60"}`}
                        />
                        <p className="text-sm font-medium">{c.name ?? "unknown"}</p>
                      </div>
                      {c.capabilities && c.capabilities.length > 0 && (
                        <p className="mt-1 ml-4 text-[11px] text-muted-foreground">
                          {c.capabilities.slice(0, 6).join(" · ")}
                        </p>
                      )}
                      {missing.length > 0 && (
                        <p className="mt-1 ml-4 font-mono text-[11px] text-amber-600">
                          Missing env: {missing.join(", ")}
                        </p>
                      )}
                      {c.error && (
                        <p className="mt-1 ml-4 font-mono text-[11px] text-rose-500/80">{c.error}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {configured ? "Ready" : "Needs setup"}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
