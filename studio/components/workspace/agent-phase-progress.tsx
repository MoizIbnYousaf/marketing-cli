"use client"

import { useState, useEffect, useRef } from "react"
import { m, AnimatePresence } from "framer-motion"
import { Check, Loader2, Circle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AGENT_PHASES, SPRING, type AgentPhaseId } from "@/lib/animation/constants"

type PhaseStatus = "pending" | "active" | "complete" | "error"

const getPhaseStatus = (
  phaseId: AgentPhaseId,
  currentPhase: AgentPhaseId | null
): PhaseStatus => {
  if (!currentPhase) return "pending"

  const phaseIndex = AGENT_PHASES.findIndex((p) => p.id === phaseId)
  const currentIndex = AGENT_PHASES.findIndex((p) => p.id === currentPhase)

  if (phaseIndex < currentIndex) return "complete"
  if (phaseIndex === currentIndex) return "active"
  return "pending"
}

const PhaseIcon = ({ status }: { status: PhaseStatus }) => {
  switch (status) {
    case "complete":
      return (
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING.snappy}
        >
          <Check className="size-3" />
        </m.div>
      )
    case "active":
      return (
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="size-3" />
        </m.div>
      )
    case "error":
      return <AlertCircle className="size-3" />
    default:
      return <Circle className="size-2.5 opacity-40" />
  }
}

const ElapsedTimer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startTime) / 1000))
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <m.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-[10px] text-muted-foreground tabular-nums"
    >
      {elapsed}s elapsed
    </m.span>
  )
}

export function AgentPhaseProgress({
  currentPhase,
  error,
  startedAt,
  compact = false,
  className,
}: {
  currentPhase: AgentPhaseId | null
  error?: string | null
  startedAt?: number
  compact?: boolean
  className?: string
}) {
  const internalStart = useRef<number | null>(null)
  if (currentPhase && !internalStart.current) {
    internalStart.current = Date.now()
  }
  if (!currentPhase) {
    internalStart.current = null
  }
  const effectiveStartTime = startedAt ?? internalStart.current

  const activePhase = currentPhase
    ? AGENT_PHASES.find((p) => p.id === currentPhase)
    : null

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Colored segment bar */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {AGENT_PHASES.map((phase) => {
          const status =
            error && phase.id === currentPhase
              ? "error"
              : getPhaseStatus(phase.id, currentPhase)

          return (
            <div
              key={`bar-${phase.id}`}
              className="flex-1 relative overflow-hidden rounded-full"
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-full transition-opacity duration-300",
                  status === "complete" && "opacity-100",
                  status === "active" && "opacity-100",
                  status === "error" && "opacity-100",
                  status === "pending" && "opacity-30"
                )}
                style={{ backgroundColor: phase.color }}
              />
              {status === "active" && (
                <m.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {compact ? (
        <div className="flex items-center justify-between px-1">
          {activePhase ? (
            <m.span
              key={activePhase.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-accent"
            >
              {activePhase.label}...
            </m.span>
          ) : (
            <span />
          )}
          {currentPhase && effectiveStartTime ? (
            <ElapsedTimer startTime={effectiveStartTime} />
          ) : (
            <span />
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            {AGENT_PHASES.map((phase, i) => {
              const status =
                error && phase.id === currentPhase
                  ? "error"
                  : getPhaseStatus(phase.id, currentPhase)

              return (
                <div key={phase.id} className="flex items-center gap-1 flex-1">
                  <m.div
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors relative overflow-hidden",
                      "flex-1 justify-center",
                      status === "complete" && "bg-accent/10 text-accent",
                      status === "active" && "bg-accent/15 text-accent",
                      status === "error" && "bg-destructive/10 text-destructive",
                      status === "pending" && "bg-muted/60 text-muted-foreground/50"
                    )}
                    layout
                  >
                    <AnimatePresence>
                      {status === "active" && (
                        <m.div
                          className="absolute inset-0 rounded-md"
                          style={{ backgroundColor: phase.color }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.05, 0.12, 0.05] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </AnimatePresence>

                    {status === "active" && (
                      <m.div
                        className="absolute inset-0 rounded-md"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                        }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}

                    <PhaseIcon status={status} />
                    <span className="hidden sm:inline truncate relative z-10">
                      {phase.label}
                    </span>
                  </m.div>

                  {i < AGENT_PHASES.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-2 shrink-0 transition-colors duration-300",
                        status === "complete" ? "bg-accent/40" : "bg-border"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-1">
            {currentPhase && effectiveStartTime ? (
              <ElapsedTimer startTime={effectiveStartTime} />
            ) : (
              <span />
            )}
          </div>
        </>
      )}

      {error && (
        <m.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive px-1"
        >
          {error}
        </m.p>
      )}
    </div>
  )
}
