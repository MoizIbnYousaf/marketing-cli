"use client"

// WarRoomList -- minimal competitor war-room on the Signals tab.
// GET /api/compete (mktg compete list --json) -> name, url, last change.
// "Scan now" hits GET /api/compete/scan (mktg compete scan --json) and
// re-reads the list. Deliberately small; the full diff lives in the CLI.

import { useState } from "react"
import useSWR from "swr"
import { Crosshair, RefreshCw } from "lucide-react"
import { dataFetcher } from "@/lib/fetcher"
import type { CompeteListData, CompeteScanData } from "@/lib/mktg"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function lastChange(iso: string | null): string {
  if (!iso) return "never scanned"
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return "unknown"
  const hours = Math.floor((Date.now() - ts) / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function WarRoomList() {
  const { data, error, mutate } = useSWR<CompeteListData>("/api/compete", dataFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState<string | null>(null)

  const scan = async () => {
    setScanning(true)
    setScanNote(null)
    try {
      const r = await dataFetcher<CompeteScanData>("/api/compete/scan")
      setScanNote(`${r.changed} changed · ${r.new} new · ${r.errors} errors`)
      await mutate()
    } catch (e) {
      setScanNote(e instanceof Error ? e.message : "scan failed")
    } finally {
      setScanning(false)
    }
  }

  const entries = data?.urls ?? []

  return (
    <section
      data-testid="war-room"
      className="mb-5 rounded-panel border border-border/60 bg-card/60 p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Crosshair className="size-4 text-foreground" />
          War room
          <span className="text-xs font-normal text-muted-foreground">{entries.length} tracked</span>
        </h2>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => void scan()}
          disabled={scanning || entries.length === 0}
          className="gap-1.5 text-muted-foreground"
        >
          <RefreshCw className={cn("size-3.5", scanning && "animate-spin")} />
          {scanning ? "Scanning…" : "Scan now"}
        </Button>
      </header>
      {error ? (
        <p className="text-xs text-muted-foreground">Competitor list unavailable: {error.message}</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No competitors tracked. Run <code>mktg compete watch &lt;url&gt;</code>.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {entries.map((e) => (
            <li key={e.url} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{e.lastTitle || hostLabel(e.url)}</span>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {e.url}
                </a>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{lastChange(e.lastScan)}</span>
            </li>
          ))}
        </ul>
      )}
      {scanNote ? <p className="mt-2 text-xs text-muted-foreground">{scanNote}</p> : null}
    </section>
  )
}
