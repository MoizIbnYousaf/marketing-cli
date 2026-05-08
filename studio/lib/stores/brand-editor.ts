import { create } from "zustand"

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict"

interface BrandEditorState {
  /** Currently-open brand file, e.g. "voice-profile.md". */
  currentFile: string | null
  /** Raw markdown content being edited. */
  content: string
  /** mtime the server last reported for this file (used for conflict detection). */
  mtime: string | null
  /** Workflow state for the save indicator. */
  saveStatus: SaveStatus
  /** Error details when saveStatus === "error" or "conflict". */
  saveError: { message: string; fix?: string } | null
  /** If true, an external write landed while the user was editing -- merge prompt. */
  externalChange: boolean
  openFile: (args: { name: string; content: string; mtime: string }) => void
  closeFile: () => void
  updateContent: (content: string) => void
  setSaveStatus: (status: SaveStatus, error?: { message: string; fix?: string } | null) => void
  setMtime: (mtime: string) => void
  markExternalChange: (changed: boolean) => void
  reset: () => void
}

const INITIAL: Omit<
  BrandEditorState,
  "openFile" | "closeFile" | "updateContent" | "setSaveStatus" | "setMtime" | "markExternalChange" | "reset"
> = {
  currentFile: null,
  content: "",
  mtime: null,
  saveStatus: "idle",
  saveError: null,
  externalChange: false,
}

export const useBrandEditorStore = create<BrandEditorState>((set, get) => ({
  ...INITIAL,
  openFile: ({ name, content, mtime }) =>
    set({
      currentFile: name,
      content,
      mtime,
      saveStatus: "saved",
      saveError: null,
      externalChange: false,
    }),
  closeFile: () => set({ ...INITIAL }),
  updateContent: (content) => {
    const prev = get().content
    if (content === prev) return
    set({
      content,
      saveStatus: "dirty",
      saveError: null,
    })
  },
  setSaveStatus: (status, error = null) =>
    set({
      saveStatus: status,
      saveError: status === "error" || status === "conflict" ? error ?? null : null,
    }),
  setMtime: (mtime) => set({ mtime }),
  markExternalChange: (changed) => set({ externalChange: changed }),
  reset: () => set({ ...INITIAL }),
}))
