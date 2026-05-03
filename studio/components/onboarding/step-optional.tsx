"use client"

import { ArrowLeft, ArrowRight, ExternalLink, KeyRound } from "lucide-react"
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
  onBack: () => void
  loading: boolean
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
  onBack,
  loading,
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

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onNext} disabled={loading} className="text-muted-foreground">
            Skip all
          </Button>
          <Button
            onClick={onNext}
            disabled={loading}
            size="lg"
            className="gap-2"
          >
            {loading ? "Saving…" : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
