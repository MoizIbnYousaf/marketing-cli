"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  BookOpen,
  Images,
  PanelRightOpen,
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
  onActivityOpen,
  activityOpen = false,
  spikeCount,
  className,
}: {
  onActivityOpen?: () => void
  activityOpen?: boolean
  spikeCount?: number
  className?: string
}) {
  return (
    <div
      data-demo-id="workspace-tabs"
      className={cn("border-b border-border px-4 py-2 md:px-6", className)}
    >
      <div className="flex items-center gap-2">
        <TabsList
          aria-label="Studio workflows"
          className="h-12 min-w-0 flex-1 justify-start gap-1 overflow-x-auto border border-border bg-surface-3/80 p-1 shadow-sm"
        >
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon
            const count = tab.id === "pulse" ? spikeCount : undefined

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group relative shrink-0 flex-none px-4 data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
                {tab.id === "pulse" && (
                  <span className="hidden size-1.5 animate-pulse rounded-full bg-success group-data-[state=active]:block" aria-hidden />
                )}
                {count !== undefined && count > 0 && (
                  <span
                    aria-label={`${count} active signal${count === 1 ? "" : "s"}`}
                    className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground"
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {onActivityOpen ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onActivityOpen}
            aria-label="Open /cmo activity"
            aria-expanded={activityOpen}
            aria-controls="workspace-activity-sheet"
            className="hidden shrink-0 text-muted-foreground md:flex xl:hidden"
          >
            <PanelRightOpen className="size-4" aria-hidden />
            Activity
          </Button>
        ) : null}
      </div>
    </div>
  )
}
