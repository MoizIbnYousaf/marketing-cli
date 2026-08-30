"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

/** Hydration-safe client readiness without an effect-driven extra state update. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
}
