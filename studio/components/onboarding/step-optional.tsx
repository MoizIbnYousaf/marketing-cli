"use client"

import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  firecrawlKey: string
  exaKey: string
  resendKey: string
  onChangeFirecrawl: (v: string) => void
  onChangeExa: (v: string) => void
  onChangeResend: (v: string) => void
  onNext: () => void
  /** Skip without saving. Distinct from onNext, which attempts a save first. */
  onSkip: () => void
  onBack: () => void
  loading: boolean
  /**
   * Inline error surfaced by the wizard when `/api/settings/env` failed.
   * Lane 8 Wave B / neonpulse P1-6: previously this was swallowed and the
   * wizard advanced thinking keys had saved when they had not.
   */
  error?: string | null
  errorFix?: string | null
}

const integrations = [
  {
    key: "firecrawl" as const,
    label: "FIRECRAWL_API_KEY",
    placeholder: "fc-…",
    desc: "Web scraping for landscape-scan skill",
    link: "https://firecrawl.dev",
    linkLabel: "Get key",
  },
  {
    key: "exa" as const,
    label: "EXA_API_KEY",
    placeholder: "exa-…",
    desc: "Deep web research (most skills benefit)",
    link: "https://exa.ai",
    linkLabel: "Get key",
  },
  {
    key: "resend" as const,
    label: "RESEND_API_KEY",
    placeholder: "re_…",
    desc: "Email sequences and send-email skill",
    link: "https://resend.com",
    linkLabel: "Get key",
  },
]

export function StepOptional({
  firecrawlKey,
  exaKey,
  resendKey,
  onChangeFirecrawl,
  onChangeExa,
  onChangeResend,
  onNext,
  onSkip,
  onBack,
  loading,
  error,
  errorFix,
}: Props) {
  const values = { firecrawl: firecrawlKey, exa: exaKey, resend: resendKey }
  const handlers = {
    firecrawl: onChangeFirecrawl,
    exa: onChangeExa,
    resend: onChangeResend,
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Optional integrations
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These unlock extra skills. All optional: skip freely, add later in
          Settings.
        </p>
      </div>

      <div className="space-y-5">
        {integrations.map(({ key, label, placeholder, desc, link, linkLabel }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className="text-sm font-medium">
                {label}
              </Label>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                {linkLabel}
                <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id={key}
                type="password"
                placeholder={placeholder}
                value={values[key]}
                onChange={(e) => handlers[key](e.target.value)}
                className="pl-9 h-10 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div
          id="optional-save-error"
          role="alert"
          className="flex items-start gap-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Couldn&apos;t save the optional keys
            </p>
            <p className="text-foreground/85">{error}</p>
            {errorFix ? (
              <p className="text-[11px] text-muted-foreground">{errorFix}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Nothing was written to .env.local. Edit and try again, or
              continue without saving and add the keys later in Settings.
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
            {error ? "Continue without saving" : "Skip all"}
          </Button>
          <Button
            onClick={onNext}
            disabled={loading}
            size="lg"
            className="gap-2"
            aria-describedby={error ? "optional-save-error" : undefined}
          >
            {loading
              ? "Saving…"
              : error
                ? "Try again"
                : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
