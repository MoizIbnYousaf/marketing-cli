"use client"

import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  apiKey: string
  apiBase: string
  onChangeKey: (v: string) => void
  onChangeBase: (v: string) => void
  onNext: () => void
  /** Skip without saving. Distinct from onNext, which attempts a save first. */
  onSkip: () => void
  onBack: () => void
  loading: boolean
  /**
   * Inline error surfaced by the wizard when `/api/settings/env` failed.
   * Lane 8 Wave B / neonpulse P1-6: previously this was swallowed and the
   * wizard advanced to the next step thinking the key saved when it had not.
   */
  error?: string | null
  errorFix?: string | null
}

export function StepPostiz({
  apiKey,
  apiBase,
  onChangeKey,
  onChangeBase,
  onNext,
  onSkip,
  onBack,
  loading,
  error,
  errorFix,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect social accounts
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Postiz is the studio's primary social backend while the native
          connectors roll out for X, TikTok, Instagram, Reddit, and LinkedIn.
          You can skip this and add it later in Settings.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="postiz-key" className="text-sm font-medium">
              POSTIZ_API_KEY
            </Label>
            <a
              href="https://postiz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Get a key
              <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="postiz-key"
              type="password"
              placeholder="pk_live_…"
              value={apiKey}
              onChange={(e) => onChangeKey(e.target.value)}
              className="pl-9 h-10 font-mono text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postiz-base" className="text-sm font-medium">
            POSTIZ_API_BASE{" "}
            <span className="text-muted-foreground font-normal">
              (hosted or self-hosted)
            </span>
          </Label>
          <Input
            id="postiz-base"
            type="url"
            placeholder="https://api.postiz.com or http://localhost:4007"
            value={apiBase}
            onChange={(e) => onChangeBase(e.target.value)}
            className="h-10 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Docker self-host roots like http://localhost:4007 are accepted; Studio retries through /api automatically.
          </p>
        </div>
      </div>

      {error ? (
        <div
          id="postiz-save-error"
          role="alert"
          className="flex items-start gap-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Couldn&apos;t save the Postiz key
            </p>
            <p className="text-foreground/85">{error}</p>
            {errorFix ? (
              <p className="text-[11px] text-muted-foreground">{errorFix}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              The key was not written to .env.local. Edit and try again, or
              continue without saving and add it later in Settings.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={loading}
            className="text-muted-foreground"
          >
            {error ? "Continue without saving" : "Skip for now"}
          </Button>
          <Button
            onClick={onNext}
            disabled={loading}
            size="lg"
            className="gap-2"
            aria-describedby={error ? "postiz-save-error" : undefined}
          >
            {loading
              ? "Saving…"
              : error
                ? "Try again"
                : "Save & continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
