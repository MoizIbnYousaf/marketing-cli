"use client"

import { SignalRow } from "./signal-row"
import type { Signal } from "@/lib/types/signals"

export function SignalList({
  signals,
  selectedId,
  onSelect,
  hasAnySignals,
}: {
  signals: Signal[]
  selectedId: string | null
  onSelect: (id: string) => void
  hasAnySignals?: boolean
}) {
  if (signals.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">
          {hasAnySignals
            ? "No signals match this filter right now. Try All or switch sorting."
            : "No signals yet. Run a refresh to pull in trends."}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex flex-col">
        {signals.map((signal) => (
          <SignalRow
            key={signal.id}
            signal={signal}
            isSelected={selectedId === signal.id}
            onClick={() => onSelect(signal.id)}
          />
        ))}
      </div>
    </div>
  )
}
