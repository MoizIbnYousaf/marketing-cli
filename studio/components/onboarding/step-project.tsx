"use client"

import { ArrowRight, Globe, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  url: string
  onChange: (v: string) => void
  onNext: () => void
  loading: boolean
  /**
   * Inline error surfaced by the wizard when `/api/init` failed. A17 /
   * H1-01: previously this was swallowed and the user was advanced to
   * the next step thinking mktg init ran, when it hadn't.
   */
  error?: string | null
  errorFix?: string | null
}

export function StepProject({
  url,
  onChange,
  onNext,
  loading,
  error,
  errorFix,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          What&apos;s your project?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter your website URL and /cmo will scrape your brand voice,
          audience, and positioning automatically. Leave blank to start fresh.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="text-sm font-medium">
          Website URL{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="url"
            type="url"
            placeholder="https://yourcompany.com"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9 h-10"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onNext()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "project-init-error" : "project-init-hint"}
          />
        </div>
        <p id="project-init-hint" className="text-xs text-muted-foreground">
          Runs{" "}
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
            mktg init {url ? `--from ${url}` : "--yes"}
          </code>{" "}
          server-side
        </p>
      </div>

      {error ? (
        <div
          id="project-init-error"
          role="alert"
          className="flex items-start gap-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Couldn&apos;t initialize the project
            </p>
            <p className="text-foreground/85">{error}</p>
            {errorFix ? (
              <p className="text-[11px] text-muted-foreground">{errorFix}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          onClick={onNext}
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          {loading
            ? "Initializing…"
            : error
              ? "Retry"
              : url
                ? "Import brand"
                : "Start fresh"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
