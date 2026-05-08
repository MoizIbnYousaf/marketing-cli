"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"
import { resolveStudioApiBase } from "@/lib/studio-api-base"
import { studioAuthHeaders } from "@/lib/studio-token"

type KeyStatus = "green" | "amber" | "red"

interface EnvKey {
  key: string
  label: string
  description: string
  required: boolean
  placeholder?: string
  signupUrl?: string
}

const ENV_KEYS: EnvKey[] = [
  {
    key: "POSTIZ_API_KEY",
    label: "Postiz API key",
    description: "Primary social backend for studio publishing across 30+ platforms.",
    required: false,
    placeholder: "ptz_...",
    signupUrl: "https://api.postiz.com",
  },
  {
    key: "POSTIZ_API_BASE",
    label: "Postiz API base",
    description: "Primary backend base URL. Hosted defaults to https://api.postiz.com. Docker self-host roots like http://localhost:4007 are accepted and retried through /api automatically.",
    required: false,
    placeholder: "https://api.postiz.com or http://localhost:4007",
  },
  {
    key: "TYPEFULLY_API_KEY",
    label: "Typefully API key",
    description: "Optional specialist fallback for X / LinkedIn thread workflows.",
    required: false,
    placeholder: "tyf_...",
    signupUrl: "https://typefully.com/settings/api",
  },
  {
    key: "EXA_API_KEY",
    label: "Exa API key",
    description: "Primary web-research backend used by most /cmo skills.",
    required: false,
    placeholder: "exa_...",
    signupUrl: "https://exa.ai",
  },
  {
    key: "FIRECRAWL_API_KEY",
    label: "Firecrawl API key",
    description: "Scraping for landscape-scan and related skills.",
    required: false,
    placeholder: "fc-...",
    signupUrl: "https://firecrawl.dev",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API key",
    description: "Transactional + sequence email delivery.",
    required: false,
    placeholder: "re_...",
    signupUrl: "https://resend.com",
  },
]

interface IntegrationsProbe {
  ok: boolean
  unavailable?: boolean
  data?: unknown[]
  adapter?: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

function dotColor(status: KeyStatus): string {
  switch (status) {
    case "green":
      return "bg-emerald-500"
    case "amber":
      return "bg-amber-500"
    case "red":
      return "bg-rose-500/60"
  }
}

function statusLabel(status: KeyStatus): string {
  switch (status) {
    case "green":
      return "Set · verified"
    case "amber":
      return "Set · untested"
    case "red":
      return "Unset"
  }
}

export function EnvSection() {
  const STUDIO_API_BASE = resolveStudioApiBase()
  const [values, setValues] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [savedThisSession, setSavedThisSession] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const { data: postizProbe } = useSWR<IntegrationsProbe>(
    `${STUDIO_API_BASE}/api/publish/integrations?adapter=postiz`,
    fetchJson,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  )

  const statusByKey = useMemo(() => {
    const next: Record<string, KeyStatus> = {}
    for (const { key } of ENV_KEYS) {
      if (key === "POSTIZ_API_KEY" || key === "POSTIZ_API_BASE") {
        const ok = postizProbe?.ok === true
        const hasData = Array.isArray(postizProbe?.data)
        const unavailable = postizProbe?.unavailable === true
        if (ok && hasData && !unavailable) next[key] = "green"
        else if (savedThisSession.has(key)) next[key] = "amber"
        else next[key] = "red"
        continue
      }
      next[key] = savedThisSession.has(key) ? "amber" : "red"
    }
    return next
  }, [postizProbe, savedThisSession])

  function toggleVisibility(key: string) {
    setVisible((v) => ({ ...v, [key]: !v[key] }))
  }

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function saveAll() {
    const diff = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.length > 0),
    )
    if (Object.keys(diff).length === 0) {
      toast.info("Nothing to save -- no keys changed.")
      return
    }
    setSaving(true)
    try {
      // ?confirm=true is required by ironmint's destructive-write guard.
      // Audit log captures key names only (never values).
      const res = await fetch(`${STUDIO_API_BASE}/api/settings/env?confirm=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...studioAuthHeaders() },
        body: JSON.stringify(diff),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok !== true) {
        const msg = extractErrorMessage(json, `Save failed (HTTP ${res.status})`)
        const fix = extractErrorFix(json)
        toast.error(msg, fix ? { description: fix } : undefined)
        return
      }

      const savedKeys = Object.keys(diff)
      setSavedThisSession((prev) => {
        const next = new Set(prev)
        for (const k of savedKeys) next.add(k)
        return next
      })
      setValues({})

      fetch(`${STUDIO_API_BASE}/api/toast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...studioAuthHeaders() },
        body: JSON.stringify({
          level: "success",
          message: `Saved ${savedKeys.length} key${savedKeys.length === 1 ? "" : "s"} to .env.local`,
        }),
      }).catch(() => {})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const dirtyCount = Object.values(values).filter((v) => v.length > 0).length

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
          <KeyRound className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">API keys</h2>
          <p className="text-xs text-muted-foreground">
            Stored locally in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code>.
            Postiz powers the primary studio publish flow; Typefully stays optional for specialist fallback use.
          </p>
        </div>
      </header>

      <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
        {ENV_KEYS.map((k) => {
          const status = statusByKey[k.key]
          const isVisible = visible[k.key]
          return (
            <div key={k.key} className="grid grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", dotColor(status))}
                  title={statusLabel(status)}
                  aria-label={statusLabel(status)}
                />
                <div>
                  <Label htmlFor={`env-${k.key}`} className="font-mono text-xs">
                    {k.key}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">{k.description}</p>
                </div>
              </div>

              <div className="relative min-w-0">
                <Input
                  id={`env-${k.key}`}
                  type={isVisible ? "text" : "password"}
                  value={values[k.key] ?? ""}
                  placeholder={k.placeholder ?? "Not set"}
                  onChange={(e) => setValue(k.key, e.target.value)}
                  autoComplete="off"
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(k.key)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={isVisible ? "Hide value" : "Show value"}
                  tabIndex={-1}
                >
                  {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                {k.signupUrl && (
                  <a
                    href={k.signupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    Get key ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {dirtyCount > 0
            ? `${dirtyCount} key${dirtyCount === 1 ? "" : "s"} ready to save`
            : "Enter a value above to update a key."}
        </span>
        <Button onClick={saveAll} disabled={saving || dirtyCount === 0} size="sm" className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}
