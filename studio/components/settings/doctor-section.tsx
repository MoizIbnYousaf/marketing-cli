"use client"

import useSWR from "swr"
import { Stethoscope, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { extractErrorMessage } from "@/lib/api-error"
import { resolveStudioApiBase } from "@/lib/studio-api-base"

interface HealthResponse {
  ok?: boolean
  version?: string
  ts?: string
  subscribers?: number
  error?: unknown
}

interface CatalogEntry {
  name?: string
  configured?: boolean
  healthy?: boolean
  error?: string | null
  missing_envs?: string[]
}

interface CatalogStatusResponse {
  ok?: boolean
  data?: CatalogEntry[]
  error?: unknown
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return res.json()
}

function check(label: string, ok: boolean, hint?: string) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span className={`mt-1 size-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500/60"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{label}</p>
        {hint && <p className="font-mono text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{ok ? "OK" : "FAIL"}</span>
    </li>
  )
}

export function DoctorSection() {
  const STUDIO_API_BASE = resolveStudioApiBase()
  const { data: health, error: healthError, mutate: refetchHealth } = useSWR<HealthResponse>(
    `${STUDIO_API_BASE}/api/health`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true, shouldRetryOnError: true },
  )
  const { data: catalog, mutate: refetchCatalog } = useSWR<CatalogStatusResponse>(
    `${STUDIO_API_BASE}/api/catalog/status`,
    fetcher,
    { refreshInterval: 120_000 },
  )

  const serverOk = !healthError && health?.ok === true
  const catalogs = catalog?.data ?? []
  const catalogError = catalog?.ok === false ? extractErrorMessage(catalog, "Catalog probe failed") : null

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
          <Stethoscope className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">mktg doctor</h2>
          <p className="text-xs text-muted-foreground">
            Studio server + catalog health. For the full{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mktg doctor</code>{" "}
            report, run it in your terminal.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchHealth()
            refetchCatalog()
          }}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          Re-check
        </Button>
      </header>

      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70 bg-background/60">
        {check(
          "Studio API (Bun server)",
          serverOk,
          serverOk
            ? `${STUDIO_API_BASE || "same-origin"} · v${health?.version ?? "?"} · ${health?.subscribers ?? 0} SSE subscriber(s)`
            : healthError instanceof Error
              ? healthError.message
              : "Not reachable",
        )}
        {catalogError && (
          <li className="px-4 py-2.5">
            <p className="font-mono text-[11px] text-rose-500/80">{catalogError}</p>
          </li>
        )}
        {catalogs.map((c) => {
          const ok = c.configured === true && !c.error
          const hintParts: string[] = []
          if (c.missing_envs?.length) hintParts.push(`Missing env: ${c.missing_envs.join(", ")}`)
          if (c.error) hintParts.push(c.error)
          return <div key={c.name ?? Math.random()}>{check(`Catalog · ${c.name ?? "unknown"}`, ok, hintParts.join(" · "))}</div>
        })}
        {!catalogs.length && !catalogError && (
          <li className="px-4 py-3 text-center text-xs text-muted-foreground">
            No upstream catalogs registered.
          </li>
        )}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        For external-tool checks (ffmpeg, whisper-cli, yt-dlp, Exa), run{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">mktg doctor --json</code> in your
        terminal.
      </p>
    </div>
  )
}
