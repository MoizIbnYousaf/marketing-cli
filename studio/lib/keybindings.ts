export type KeyGroup = "Navigation" | "Actions" | "Help"

export interface Keybinding {
  /** Key sequence. Single entry = single keypress. Two entries = chord. */
  sequence: readonly [string] | readonly [string, string]
  description: string
  group: KeyGroup
  /** Stable unique id, used as the React key in the help overlay. */
  id: string
}

export const CHORD_WINDOW_MS = 600

export const KEYMAP: readonly Keybinding[] = [
  // Global
  { id: "help", sequence: ["?"], description: "Show keyboard shortcuts", group: "Help" },
  { id: "palette", sequence: ["/"], description: "Focus command palette", group: "Actions" },

  // Dashboard tab navigation (g-prefix)
  { id: "nav:pulse-legacy", sequence: ["g", "h"], description: "Go to Pulse", group: "Navigation" },
  { id: "nav:pulse", sequence: ["g", "p"], description: "Go to Pulse", group: "Navigation" },
  { id: "nav:signals", sequence: ["g", "c"], description: "Go to Signals", group: "Navigation" },
  { id: "nav:publish", sequence: ["g", "u"], description: "Go to Publish", group: "Navigation" },
  { id: "nav:brand", sequence: ["g", "b"], description: "Go to Brand", group: "Navigation" },
  { id: "nav:settings", sequence: ["g", ","], description: "Open Settings", group: "Navigation" },
] as const

export function isTypingContext(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if ((el as HTMLElement).isContentEditable) return true
  // cmdk / role=textbox
  const role = el.getAttribute?.("role")
  return role === "textbox" || role === "combobox"
}
