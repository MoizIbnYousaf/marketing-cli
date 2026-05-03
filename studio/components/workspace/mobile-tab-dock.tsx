"use client"

import { cn } from "@/lib/utils"
import { WORKSPACE_TABS, type WorkspaceTab } from "./workspace-tabs"

export function MobileTabDock({
  activeTab,
  onTabChange,
  spikeCount,
}: {
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
  spikeCount?: number
}) {
  return (
    <nav
      aria-label="Primary tabs"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 md:hidden"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-2xl border border-white/10 bg-[#11161a]/95 p-1.5 shadow-xl backdrop-blur-xl">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const count =
            tab.id === "hq"
                ? spikeCount
                : undefined

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // min-h-11 enforces 44px touch-target (Apple HIG + WCAG 2.5.5).
                // Labels collapse to icon-only on phones <=479px so the dock
                // stays stable at 375px-wide viewports. At >=480px the label returns.
                "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-medium transition-all",
                isActive
                  ? "bg-lime/10 text-lime ring-1 ring-lime/25"
                  : "text-[#9da09a]"
              )}
            >
              <Icon className="mb-1 size-4 shrink-0" aria-hidden />
              <span className="truncate sr-only min-[480px]:not-sr-only">
                {tab.label}
              </span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                    isActive
                      ? "bg-lime text-[#0b0b0f]"
                      : "bg-white/10 text-[#f5f0e6]"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
