"use client"

import { ArrowLeft, ArrowRight, ExternalLink, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  apiKey: string
  apiBase: string
  onChangeKey: (v: string) => void
  onChangeBase: (v: string) => void
  onNext: () => void
  onBack: () => void
  loading: boolean
}

export function StepPostiz({
  apiKey,
  apiBase,
  onChangeKey,
  onChangeBase,
  onNext,
  onBack,
  loading,
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

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onNext} disabled={loading} className="text-muted-foreground">
            Skip for now
          </Button>
          <Button
            onClick={onNext}
            disabled={loading}
            size="lg"
            className="gap-2"
          >
            {loading ? "Saving…" : "Save & continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
