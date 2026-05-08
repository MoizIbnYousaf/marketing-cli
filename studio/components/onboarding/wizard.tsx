"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { studioAuthHeaders } from "@/lib/studio-token"

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
  // Lane 8 Wave B / neonpulse P1-6: Steps 1+2 used to catch errors and
  // `// continue anyway`, silently advancing the user past failed key
  // saves. Foundation agents would then run with no integration. Now the
  // wizard mirrors the projectError pattern: surface the error inline,
  // block auto-advance, and offer an explicit "Continue without saving"
  // skip path so the user knows the integration did not save.
  const [postizError, setPostizError] = useState<string | null>(null)
  const [postizErrorFix, setPostizErrorFix] = useState<string | null>(null)
  const [optionalError, setOptionalError] = useState<string | null>(null)
  const [optionalErrorFix, setOptionalErrorFix] = useState<string | null>(null)

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
        headers: { "Content-Type": "application/json", ...studioAuthHeaders() },
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
        // 401 here means SWRProvider's bootstrap fetch failed at first
        // paint (rare; ironmint's swr-provider:46-49 flips ready=true on
        // bootstrap error to avoid a blank page). Translate the raw
        // agent-shaped fix into a human-actionable instruction.
        if (res.status === 401 || body?.error?.code === "UNAUTHORIZED") {
          setProjectError("Studio session not ready.")
          setProjectErrorFix(
            "Reload the dashboard. The launcher re-issues the bearer token on every fresh nav.",
          )
          return
        }
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

  // Shared envelope parser. /api/settings/env returns either
  // {ok:true, written:[...]} on success or {ok:false, error:{...}} on
  // validation/server failure. We treat anything that is not a typed
  // success envelope as a failure the user must see.
  async function saveEnv(payload: Record<string, string>): Promise<
    | { ok: true }
    | { ok: false; message: string; fix: string | null }
  > {
    try {
      // ?confirm=true is required by the destructive-write guard ironmint
      // added at /api/settings/env. Audit log captures key names only.
      const res = await fetch("/api/settings/env?confirm=true", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...studioAuthHeaders() },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: { code?: string; message?: string; fix?: string }
          }
        | null
      if (res.ok && body?.ok === true) return { ok: true }
      // 401 / UNAUTHORIZED reaches the wizard only in the rare branch where
      // SWRProvider's /api/auth/bootstrap fetch failed at first paint
      // (ironmint, swr-provider.tsx:46-49 -- ready=true on bootstrap error
      // to avoid a permanent blank page). The server's fix message in that
      // case ("Send Authorization: Bearer <token>...") is written for an
      // agent caller, not a human typing in a wizard. Translate to a
      // user-actionable instruction.
      if (res.status === 401 || body?.error?.code === "UNAUTHORIZED") {
        return {
          ok: false,
          message: "Studio session not ready.",
          fix: "Reload the dashboard. The launcher re-issues the bearer token on every fresh nav.",
        }
      }
      const message =
        body?.error?.message ??
        (res.ok
          ? "The server accepted the request but did not confirm success."
          : `Server returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`)
      return { ok: false, message, fix: body?.error?.fix ?? null }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Network error reaching /api/settings/env",
        fix: "Check that the studio server is running on port 3001.",
      }
    }
  }

  async function handlePostiz() {
    // No key entered: nothing to save, advance directly. The "Skip for
    // now" button calls handlePostizSkip; this path is hit when the user
    // clicks the primary CTA without filling the input.
    if (!state.postizKey.trim()) {
      setPostizError(null)
      setPostizErrorFix(null)
      goTo(2)
      return
    }
    setLoading(true)
    setPostizError(null)
    setPostizErrorFix(null)
    const result = await saveEnv({
      POSTIZ_API_KEY: state.postizKey,
      POSTIZ_API_BASE: state.postizBase,
    })
    setLoading(false)
    if (!result.ok) {
      setPostizError(result.message)
      setPostizErrorFix(result.fix)
      // Block advance: user retries, edits the key, or clicks
      // "Continue without saving" to skip the integration knowingly.
      return
    }
    goTo(2)
  }

  function handlePostizSkip() {
    setPostizError(null)
    setPostizErrorFix(null)
    goTo(2)
  }

  async function handleOptional() {
    const env: Record<string, string> = {}
    if (state.firecrawlKey.trim()) env.FIRECRAWL_API_KEY = state.firecrawlKey
    if (state.exaKey.trim()) env.EXA_API_KEY = state.exaKey
    if (state.resendKey.trim()) env.RESEND_API_KEY = state.resendKey

    setOptionalError(null)
    setOptionalErrorFix(null)

    if (Object.keys(env).length === 0) {
      goTo(3)
      return
    }

    setLoading(true)
    const result = await saveEnv(env)
    setLoading(false)
    if (!result.ok) {
      setOptionalError(result.message)
      setOptionalErrorFix(result.fix)
      return
    }
    goTo(3)
  }

  function handleOptionalSkip() {
    setOptionalError(null)
    setOptionalErrorFix(null)
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
                  onChangeKey={(postizKey) => {
                    update({ postizKey })
                    if (postizError) {
                      setPostizError(null)
                      setPostizErrorFix(null)
                    }
                  }}
                  onChangeBase={(postizBase) => {
                    update({ postizBase })
                    if (postizError) {
                      setPostizError(null)
                      setPostizErrorFix(null)
                    }
                  }}
                  onNext={handlePostiz}
                  onSkip={handlePostizSkip}
                  onBack={() => { setDirection(-1); update({ step: 0 }) }}
                  loading={loading}
                  error={postizError}
                  errorFix={postizErrorFix}
                />
              )}
              {state.step === 2 && (
                <StepOptional
                  firecrawlKey={state.firecrawlKey}
                  exaKey={state.exaKey}
                  resendKey={state.resendKey}
                  onChangeFirecrawl={(firecrawlKey) => {
                    update({ firecrawlKey })
                    if (optionalError) {
                      setOptionalError(null)
                      setOptionalErrorFix(null)
                    }
                  }}
                  onChangeExa={(exaKey) => {
                    update({ exaKey })
                    if (optionalError) {
                      setOptionalError(null)
                      setOptionalErrorFix(null)
                    }
                  }}
                  onChangeResend={(resendKey) => {
                    update({ resendKey })
                    if (optionalError) {
                      setOptionalError(null)
                      setOptionalErrorFix(null)
                    }
                  }}
                  onNext={handleOptional}
                  onSkip={handleOptionalSkip}
                  onBack={() => { setDirection(-1); update({ step: 1 }) }}
                  loading={loading}
                  error={optionalError}
                  errorFix={optionalErrorFix}
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
