"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

import { StepProject } from "./step-project"
import { StepPostiz } from "./step-postiz"
import { StepOptional } from "./step-optional"
import { StepBuilding } from "./step-building"
import { StepDone } from "./step-done"

const STORAGE_KEY = "mktg-studio:onboarding"
const TOTAL_STEPS = 5

// Steps: 0=project, 1=postiz, 2=optional, 3=building, 4=done

interface WizardState {
  step: number
  url: string
  postizKey: string
  postizBase: string
  firecrawlKey: string
  exaKey: string
  resendKey: string
}

const DEFAULT_STATE: WizardState = {
  step: 0,
  url: "",
  postizKey: "",
  postizBase: "https://api.postiz.com",
  firecrawlKey: "",
  exaKey: "",
  resendKey: "",
}

function loadState(): WizardState {
  if (typeof window === "undefined") return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state: WizardState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
  }),
}

export function Wizard() {
  const [state, setState] = useState<WizardState>(DEFAULT_STATE)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  // A17 / H1-01: /api/init failures used to be swallowed with empty
  // catch {}. The wizard advanced regardless and the user saw no signal
  // that the server call had failed. Surfacing the error inline + blocking
  // Next until retry succeeds.
  const [projectError, setProjectError] = useState<string | null>(null)
  const [projectErrorFix, setProjectErrorFix] = useState<string | null>(null)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = loadState()
    // Don't resume into building step; re-trigger it
    if (saved.step === 3) saved.step = 2
    setState(saved)
    setHydrated(true)
  }, [])

  // Persist on every change
  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  const update = useCallback(
    (patch: Partial<WizardState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    []
  )

  const goTo = useCallback((next: number) => {
    setDirection(next > 0 ? 1 : -1)
    update({ step: next })
  }, [update])

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function handleProject() {
    setLoading(true)
    setProjectError(null)
    setProjectErrorFix(null)
    try {
      const res = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: state.url || undefined }),
      })
      // Attempt to parse the envelope even on non-2xx: the studio's
      // error responses carry {ok:false, error:{code,message,fix}}.
      const body = (await res.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: { code?: string; message?: string; fix?: string }
            data?: unknown
          }
        | null

      const envelopeOk = body?.ok === true
      if (!res.ok || !envelopeOk) {
        const message =
          body?.error?.message ??
          (res.ok
            ? "The server accepted the request but did not confirm success."
            : `Server returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`)
        setProjectError(message)
        setProjectErrorFix(body?.error?.fix ?? null)
        // Block advance: user must retry or correct input.
        return
      }

      goTo(1)
    } catch (e) {
      // Network-level failure (server down, CORS, DNS, etc.). Block +
      // retry rather than silently skip.
      setProjectError(
        e instanceof Error ? e.message : "Network error reaching /api/init",
      )
      setProjectErrorFix("Check that the studio server is running on port 3001.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePostiz() {
    if (!state.postizKey.trim()) {
      goTo(2)
      return
    }
    setLoading(true)
    try {
      await fetch("/api/settings/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          POSTIZ_API_KEY: state.postizKey,
          POSTIZ_API_BASE: state.postizBase,
        }),
      })
    } catch {
      // continue anyway
    } finally {
      setLoading(false)
      goTo(2)
    }
  }

  async function handleOptional() {
    const env: Record<string, string> = {}
    if (state.firecrawlKey.trim()) env.FIRECRAWL_API_KEY = state.firecrawlKey
    if (state.exaKey.trim()) env.EXA_API_KEY = state.exaKey
    if (state.resendKey.trim()) env.RESEND_API_KEY = state.resendKey

    if (Object.keys(env).length > 0) {
      setLoading(true)
      try {
        await fetch("/api/settings/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(env),
        })
      } catch {
        // continue anyway
      } finally {
        setLoading(false)
      }
    }
    goTo(3)
  }

  if (!hydrated) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress dots */}
      {state.step < 4 && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < state.step
                  ? "bg-primary h-2 w-8"
                  : i === state.step
                  ? "bg-primary h-2.5 w-10"
                  : "bg-muted h-2 w-6"
              }`}
            />
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={state.step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {state.step === 0 && (
                <StepProject
                  url={state.url}
                  onChange={(url) => {
                    update({ url })
                    // Clear error when the user edits the URL: they're
                    // telling us they know it failed.
                    if (projectError) {
                      setProjectError(null)
                      setProjectErrorFix(null)
                    }
                  }}
                  onNext={handleProject}
                  loading={loading}
                  error={projectError}
                  errorFix={projectErrorFix}
                />
              )}
              {state.step === 1 && (
                <StepPostiz
                  apiKey={state.postizKey}
                  apiBase={state.postizBase}
                  onChangeKey={(postizKey) => update({ postizKey })}
                  onChangeBase={(postizBase) => update({ postizBase })}
                  onNext={handlePostiz}
                  onBack={() => { setDirection(-1); update({ step: 0 }) }}
                  loading={loading}
                />
              )}
              {state.step === 2 && (
                <StepOptional
                  firecrawlKey={state.firecrawlKey}
                  exaKey={state.exaKey}
                  resendKey={state.resendKey}
                  onChangeFirecrawl={(firecrawlKey) => update({ firecrawlKey })}
                  onChangeExa={(exaKey) => update({ exaKey })}
                  onChangeResend={(resendKey) => update({ resendKey })}
                  onNext={handleOptional}
                  onBack={() => { setDirection(-1); update({ step: 1 }) }}
                  loading={loading}
                />
              )}
              {state.step === 3 && (
                <StepBuilding onDone={() => goTo(4)} />
              )}
              {state.step === 4 && <StepDone />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {state.step < 3 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Progress saved. Refresh anytime to resume.
        </p>
      )}
    </div>
  )
}
