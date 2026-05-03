"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Database, FileText, Layers } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionError } from "../section-error"
import type { LiveProofData } from "@/lib/types/pulse"

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function LiveProofCard() {
  const [dossier, setDossier] = useState<LiveProofData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoaded(false)
    setLoadError(null)
    try {
      const response = await fetch("/api/pulse/live-proof", { cache: "no-store" })
      if (!response.ok) {
        setLoadError(new Error(`HTTP ${response.status}`))
        setLoaded(true)
        return
      }
      const data = (await response.json()) as LiveProofData
      setDossier(data)
      setLoaded(true)
    } catch (e) {
      setLoadError(e)
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await load()
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  if (!loaded) {
    return <div className="h-28 animate-pulse rounded-lg border border-border bg-muted/40" />
  }

  if (loadError) {
    return <SectionError error={loadError} onRetry={load} label="Live proof unavailable" />
  }

  if (!dossier) return null

  const smokeSummary = dossier.smokeEvidence?.[0]?.summary

  return (
    <Card className="border-border bg-subtle/50 border-l-2 border-l-teal-500">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-teal-600" />
            <p className="text-sm font-semibold text-foreground">Live Validation Evidence</p>
          </div>
          <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30">
            Client-ready
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Updated {formatDate(dossier.generatedAt)} from saved run artifacts.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Layers className="size-3" />
              Runs indexed
            </div>
            <p className="text-sm font-semibold tabular-nums">{dossier.reportCount}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Database className="size-3" />
              Probe items
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {dossier.totals.probeItems.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileText className="size-3" />
              Evidence packs
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {dossier.totals.collectorEvidence.toLocaleString()}
            </p>
          </div>
        </div>

        {smokeSummary ? (
          <p className="text-xs text-foreground/90">{smokeSummary}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
