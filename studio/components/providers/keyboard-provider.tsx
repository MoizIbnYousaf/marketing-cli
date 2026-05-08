"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { usePalette } from "@/components/command-palette/palette-provider"
import { KeyboardHelp } from "@/components/keyboard-help"
import { useWorkspaceStore, type WorkspaceTab } from "@/lib/stores/workspace"
import { CHORD_WINDOW_MS, isTypingContext } from "@/lib/keybindings"

const TAB_BY_CHORD: Record<string, WorkspaceTab> = {
  p: "pulse",
  h: "pulse",
  c: "signals",
  u: "publish",
  b: "brand",
}

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const paletteCtx = usePalette()
  const setWorkspaceTab = useWorkspaceStore((s) => s.setWorkspaceTab)
  const [helpOpen, setHelpOpen] = useState(false)
  const chordRef = useRef<{ key: string; ts: number } | null>(null)

  const dispatchChord = useCallback(
    (leader: string, follow: string) => {
      if (leader !== "g") return false
      const tab = TAB_BY_CHORD[follow]
      if (tab) {
        setWorkspaceTab(tab)
        router.push(`/dashboard${tab === "pulse" ? "" : `?tab=${tab}`}`)
        return true
      }
      if (follow === ",") {
        router.push("/settings")
        return true
      }
      return false
    },
    [router, setWorkspaceTab],
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when any modifier is held (except pure Shift for "?")
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const target = document.activeElement as Element | null
      if (isTypingContext(target)) {
        // Allow Esc to blur inputs; other keys are typed normally.
        if (e.key === "Escape" && target && "blur" in target) {
          ;(target as HTMLElement).blur()
        }
        return
      }

      const key = e.key

      // Help overlay: close on Escape when open
      if (helpOpen && e.key === "Escape") {
        e.preventDefault()
        setHelpOpen(false)
        return
      }

      // "?" → open help (Shift + / on most layouts emits "?")
      if (key === "?") {
        e.preventDefault()
        setHelpOpen((v) => !v)
        return
      }

      // "/" → focus the palette (shortcut to Cmd+K)
      if (key === "/") {
        e.preventDefault()
        paletteCtx.open()
        return
      }

      // Chord handling -- only single-character lowercase keys participate
      const now = Date.now()
      const last = chordRef.current

      if (last && now - last.ts < CHORD_WINDOW_MS) {
        const handled = dispatchChord(last.key, key)
        chordRef.current = null
        if (handled) {
          e.preventDefault()
        }
        return
      }

      // Start a new chord if this is a known leader
      if (key === "g") {
        chordRef.current = { key, ts: now }
      } else {
        chordRef.current = null
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [dispatchChord, helpOpen, paletteCtx])

  return (
    <>
      {children}
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
