"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { Palette } from "./palette"

interface PaletteContextValue {
  open: () => void
  close: () => void
  toggle: () => void
}

const PaletteContext = createContext<PaletteContextValue>({
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function usePalette() {
  return useContext(PaletteContext)
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  // Cmd+K / Ctrl+K global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey
      if (modifier && e.key === "k") {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  return (
    <PaletteContext.Provider value={{ open, close, toggle }}>
      {children}
      <Palette open={isOpen} onClose={close} />
    </PaletteContext.Provider>
  )
}
