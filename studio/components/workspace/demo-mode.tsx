"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, m } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Activity as ActivityIcon,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  type WorkspacePlatformFilter,
  type WorkspaceStreamFilter,
  type WorkspaceTab,
  type WorkspaceTimeWindow,
} from "@/lib/stores/workspace"

type DemoStep = {
  id: string
  eyebrow: string
  title: string
  body: string
  guide: string
  outcome: string
  targetId?: string
  actionLabel?: string
  tab?: WorkspaceTab
  filters?: {
    platform?: WorkspacePlatformFilter
    stream?: WorkspaceStreamFilter
    timeWindow?: WorkspaceTimeWindow
  }
}

type DemoRect = {
  top: number
  left: number
  width: number
  height: number
}

export const WORKSPACE_DEMO_STEPS: DemoStep[] = [
  {
    id: "hq",
    eyebrow: "Start here",
    title: "See what changed first",
    body:
      "This is your live marketing dashboard. It brings together fresh intelligence, brand health, and the next moves worth reviewing today.",
    guide:
      "Start here each morning. If something important changed overnight, you will see it in one pass.",
    outcome:
      "By the end of this screen, you should know whether there is a moment worth chasing today.",
    targetId: "pulse-overview",
    tab: "hq",
  },
  {
    id: "content-library",
    eyebrow: "Signals",
    title: "See the creative /cmo is making",
    body:
      "Signals is the working library for generated images, draft campaigns, and reusable marketing assets.",
    guide:
      "Use this screen to inspect the actual assets before they move into the publishing queue.",
    outcome:
      "The CMO loop becomes concrete: idea, asset, draft, publish.",
    targetId: "content-tab",
    tab: "content",
  },
  {
    id: "publish",
    eyebrow: "Action surface",
    title: "Turn a message into a real queued action",
    body:
      "Publish is the execution layer. Once you know what matters, this is where you route a post into the native backend or Postiz.",
    guide:
      "Use Publish when a decision is already made and you want the system to stage or queue the next move.",
    outcome:
      "The dashboard stays compact: decide in Pulse, review in Signals, act in Publish.",
    targetId: "publish-tab",
    tab: "publish",
  },
  {
    id: "activity",
    eyebrow: "/cmo Activity",
    title: "Watch /cmo work in real time",
    body:
      "The Activity panel streams every skill run, brand-file write, publish, and nav event that /cmo fires from your Claude Code terminal. No chat widget — the studio just mirrors what your CMO is doing.",
    guide:
      "Keep this panel open while you talk to /cmo in your terminal. Each action shows up live, with files changed and timestamps.",
    outcome:
      "The dashboard reflects /cmo's work; you stay in one view while the agent runs.",
    targetId: "activity-copilot",
  },
]

const highlightByStepId: Record<string, string> = {
  hq: "from-amber-400/20 via-orange-400/10 to-transparent",
  "content-library": "from-cyan-300/20 via-sky-400/10 to-transparent",
  publish: "from-emerald-400/20 via-lime-400/10 to-transparent",
  activity: "from-violet-400/20 via-cyan-400/10 to-transparent",
}

const measureDemoRect = (targetId: string | undefined): DemoRect | null => {
  if (!targetId) return null
  const element = document.querySelector<HTMLElement>(`[data-demo-id="${targetId}"]`)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export function DemoMode() {
  const setWorkspaceTab = useWorkspaceStore((state) => state.setWorkspaceTab)
  const setSignalFilters = useWorkspaceStore((state) => state.setSignalFilters)
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DemoRect | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  const currentStep = WORKSPACE_DEMO_STEPS[stepIndex]

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (currentStep.tab) {
      setWorkspaceTab(currentStep.tab)
    }
    if (currentStep.filters) {
      setSignalFilters(currentStep.filters)
    }
  }, [currentStep, isOpen, setSignalFilters, setWorkspaceTab])

  useEffect(() => {
    if (!isOpen) return

    let frame = 0
    let timeoutId: number | null = null

    const update = () => {
      setTargetRect(measureDemoRect(currentStep.targetId))
    }

    frame = window.requestAnimationFrame(() => {
      update()
      const element = currentStep.targetId
        ? document.querySelector<HTMLElement>(`[data-demo-id="${currentStep.targetId}"]`)
        : null
      element?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
    })

    timeoutId = window.setTimeout(update, 240)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)

    return () => {
      window.cancelAnimationFrame(frame)
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [currentStep, isOpen])

  const progressLabel = useMemo(
    () => `${stepIndex + 1} / ${WORKSPACE_DEMO_STEPS.length}`,
    [stepIndex],
  )

  const openDemo = () => {
    setStepIndex(0)
    setIsOpen(true)
  }

  const closeDemo = () => {
    setIsOpen(false)
    setTargetRect(null)
  }

  const goNext = () => {
    if (stepIndex >= WORKSPACE_DEMO_STEPS.length - 1) {
      closeDemo()
      return
    }
    setStepIndex((index) => Math.min(index + 1, WORKSPACE_DEMO_STEPS.length - 1))
  }

  const goBack = () => {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  const runStepAction = () => {
    if (!currentStep.targetId) return
    const element = document.querySelector<HTMLElement>(`[data-demo-id="${currentStep.targetId}"]`)
    element?.click()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={openDemo}
        aria-label="Open walkthrough"
        className="rounded-full border border-border/70 bg-background/75 text-muted-foreground hover:bg-muted/45 hover:text-foreground"
      >
        <Sparkles className="size-4" />
      </Button>

      {portalReady && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
              <div className="absolute inset-0 bg-[rgba(9,12,18,0.72)] backdrop-blur-[3px]" />

              {targetRect && (
                <m.div
                  key={currentStep.id}
                  initial={{ opacity: 0.6, scale: 0.97 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  className={cn(
                    "pointer-events-none absolute rounded-[28px] border border-white/40 bg-gradient-to-br",
                    highlightByStepId[currentStep.id],
                  )}
                  style={{
                    boxShadow: "0 0 0 9999px rgba(9,12,18,0.72), 0 0 0 1px rgba(255,255,255,0.08), 0 30px 120px rgba(0,0,0,0.45)",
                  }}
                >
                  <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/35" />
                </m.div>
              )}

              <m.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px]"
              >
                <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[#0d141c]/94 text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(87,224,255,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(244,154,92,0.14),transparent_32%)] px-5 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-white/80">
                        mktg studio
                      </Badge>
                      <span className="text-[11px] uppercase tracking-[0.26em] text-white/45">
                        {progressLabel}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeDemo}
                      className="size-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                    <Target className="size-3.5" />
                    {currentStep.eyebrow}
                  </div>

                  <h2 className="font-serif text-[28px] leading-[1.05] tracking-tight text-white">
                    {currentStep.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {currentStep.body}
                  </p>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
                      <Sparkles className="size-3.5" />
                      Use It This Way
                    </div>
                    <p className="text-sm leading-6 text-white/86">
                      {currentStep.guide}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-white/72">
                    <Flame className="mt-0.5 size-4 shrink-0 text-cyan-200/85" />
                    <p>{currentStep.outcome}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {WORKSPACE_DEMO_STEPS.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => setStepIndex(index)}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          index === stepIndex
                            ? "bg-cyan-300"
                            : index < stepIndex
                              ? "bg-white/35"
                              : "bg-white/12",
                        )}
                        aria-label={`Go to ${step.title}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={goBack}
                      disabled={stepIndex === 0}
                      className="gap-2 text-white/70 hover:bg-white/8 hover:text-white disabled:opacity-35"
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>

                    <div className="flex items-center gap-2">
                      {currentStep.actionLabel && (
                        <Button
                          variant="outline"
                          onClick={runStepAction}
                          className="gap-2 rounded-full border-white/18 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                        >
                          <Flame className="size-4" />
                          {currentStep.actionLabel}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={closeDemo}
                        className="text-white/60 hover:bg-white/8 hover:text-white"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={goNext}
                        className="gap-2 rounded-full bg-white text-slate-950 hover:bg-cyan-100"
                      >
                        {stepIndex === WORKSPACE_DEMO_STEPS.length - 1 ? (
                          <>
                            Finish
                            <Zap className="size-4" />
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-[12px] leading-5 text-white/45">
                    This walkthrough shows the exact flow your team can use to spot a trend, inspect it, and turn it into a decision.
                  </p>
                </div>
              </div>
              </m.div>

              {currentStep.targetId === "activity-copilot" && (
                <div className="pointer-events-none absolute bottom-28 right-6 hidden items-center gap-2 rounded-full border border-white/12 bg-[#0f1720]/88 px-3 py-2 text-xs text-white/80 shadow-lg backdrop-blur md:flex">
                  <ActivityIcon className="size-3.5" />
                  /cmo Activity streams every skill run your CMO kicks off in Claude Code
                </div>
              )}
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
