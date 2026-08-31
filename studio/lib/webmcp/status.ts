import { useSyncExternalStore } from "react"

export type WebMCPState = "checking" | "unsupported" | "active" | "error"

export interface WebMCPStatus {
  state: WebMCPState
  registered: number
  total: number
  failed: string[]
}

let current: WebMCPStatus = {
  state: "checking",
  registered: 0,
  total: 0,
  failed: [],
}

const listeners = new Set<() => void>()

export function setWebMCPStatus(status: WebMCPStatus): void {
  current = status
  for (const listener of listeners) listener()
}

export function getWebMCPStatus(): WebMCPStatus {
  return current
}

export function useWebMCPStatus(): WebMCPStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getWebMCPStatus,
    getWebMCPStatus,
  )
}
