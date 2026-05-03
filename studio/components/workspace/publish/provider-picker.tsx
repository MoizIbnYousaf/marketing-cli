"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getProviderMeta,
  type PublishIntegration,
} from "@/lib/types/publish"

export function ProviderPicker({
  integrations,
  selectedIntegrationIds,
  onToggle,
  className,
}: {
  integrations: PublishIntegration[]
  selectedIntegrationIds: string[]
  onToggle: (integration: PublishIntegration) => void
  className?: string
}) {
  if (integrations.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No accounts to pick from yet.
      </p>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {integrations.map((integration) => {
        const meta = getProviderMeta(integration.providerIdentifier)
        const selected = selectedIntegrationIds.includes(integration.id)
        const disabled = !integration.connected
        return (
          <button
            key={integration.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(integration)}
            aria-label={`Toggle ${meta.label} @${integration.profile}`}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
              selected
                ? "border-accent bg-accent/10 text-accent ring-1 ring-accent/30"
                : "border-border/70 text-muted-foreground hover:border-accent/40 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
            title={
              disabled
                ? "Reconnect this account in Postiz"
                : `${meta.label} · @${integration.profile}`
            }
          >
            <span
              className={cn(
                "size-2 rounded-full",
                selected ? "bg-accent" : "bg-muted-foreground/40",
              )}
              aria-hidden
            />
            <span>{meta.label}</span>
            <span className="opacity-60">@{integration.profile}</span>
            {selected && <Check className="size-3" />}
          </button>
        )
      })}
    </div>
  )
}
