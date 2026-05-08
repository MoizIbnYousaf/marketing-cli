"use client"

import { cn } from "@/lib/utils"
import {
  Activity,
  BookOpen,
  Images,
  Send,
} from "lucide-react"

export const WORKSPACE_TABS = [
  { id: "pulse", label: "Pulse", icon: Activity },
  { id: "signals", label: "Signals", icon: Images },
  { id: "publish", label: "Publish", icon: Send },
  { id: "brand", label: "Brand", icon: BookOpen },
] as const

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]["id"]

export function WorkspaceTabs({
  activeTab,
  onTabChange,
  spikeCount,
  className,
}: {
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
  spikeCount?: number
  className?: string
}) {
  return (
    <div
      data-demo-id="workspace-tabs"
      className={cn("border-b border-white/10 px-4 py-2 md:px-6", className)}
    >
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-1 shadow-sm backdrop-blur-md">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const count =
            tab.id === "pulse"
                ? spikeCount
                : undefined

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-lime/10 text-lime shadow-sm ring-1 ring-lime/25"
                  : "text-[#9da09a] hover:bg-white/[0.055] hover:text-[#f5f0e6]"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.id === "pulse" && isActive && (
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive
                        ? "bg-lime/20 text-lime"
                        : "bg-white/10 text-[#9da09a]"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
