"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import {
  listBrandFiles,
  readBrandFile,
  regenerateBrandFile,
  writeBrandFile,
  getWriterSkill,
  type BrandFile,
} from "@/lib/brand-editor"
import { useBrandEditorStore } from "@/lib/stores/brand-editor"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import { BrandFileList } from "./brand-file-list"
import { BrandFileHeader } from "./brand-file-header"
import { MarkdownEditor } from "./editor/markdown-editor"
import { ExternalReloadDialog } from "./external-reload-dialog"
import { EmptyState } from "@/components/ui/empty-state"

const AUTOSAVE_DEBOUNCE_MS = 1500

/**
 * Brand tab: document-style markdown editor for `brand/*.md`.
 * Brand memory is raw markdown, so the editor shows the source document large
 * instead of splitting attention with a redundant preview pane.
 *
 * Live behavior:
 * - When /cmo writes a file, the SSE bridge pushes an activity entry and the
 *   server emits `brand-file-changed`. If the editor is open on that file AND
 *   has no unsaved edits, we reload silently. If it has unsaved edits, the
 *   header shows a merge prompt.
 *
 * Save behavior:
 * - Debounced autosave on every keystroke (1.5s).
 * - Explicit Cmd+S / Save button bypasses the debounce.
 * - expectedMtime is sent on every write so the server can 409 on external
 *   conflicts and we can prompt the user.
 */
export function BrandTab() {
  const {
    data: files,
    error: listError,
    isLoading: listLoading,
    mutate: refetchFiles,
  } = useSWR<BrandFile[]>("/api/brand/files", listBrandFiles, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const currentFile = useBrandEditorStore((s) => s.currentFile)
  const content = useBrandEditorStore((s) => s.content)
  const mtime = useBrandEditorStore((s) => s.mtime)
  const saveStatus = useBrandEditorStore((s) => s.saveStatus)
  const saveError = useBrandEditorStore((s) => s.saveError)
  const externalChange = useBrandEditorStore((s) => s.externalChange)
  const openFile = useBrandEditorStore((s) => s.openFile)
  const updateContent = useBrandEditorStore((s) => s.updateContent)
  const setSaveStatus = useBrandEditorStore((s) => s.setSaveStatus)
  const setMtime = useBrandEditorStore((s) => s.setMtime)
  const markExternalChange = useBrandEditorStore((s) => s.markExternalChange)

  const liveActivity = useActivityLiveStore((s) => s.items)

  const autosaveTimerRef = useRef<number | null>(null)
  const regenJobIdRef = useRef<string | null>(null)
  const regeneratingRef = useRef(false)

  // A13 / H1-45: diff-before-clobber state. When the external-change
  // banner's "See the diff" button fires, we fetch the remote content
  // and show a side-by-side modal. The user then chooses Keep or Take
  // explicitly.
  const [diffOpen, setDiffOpen] = useState(false)
  const [remoteContent, setRemoteContent] = useState<string | null>(null)
  const [diffFetching, setDiffFetching] = useState(false)

  // Open a file: fetches content + sets store.
  const handleSelect = useCallback(
    async (name: string) => {
      if (name === currentFile && saveStatus !== "idle") return
      try {
        const data = await readBrandFile(name)
        openFile({ name, content: data.content, mtime: data.mtime })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Couldn't open ${name}`)
      }
    },
    [currentFile, openFile, saveStatus],
  )

  // Save logic: shared between Cmd+S, Save button, autosave debounce.
  const saveRef = useRef<{ file: string; content: string; mtime: string | null } | null>(null)
  saveRef.current = currentFile ? { file: currentFile, content, mtime } : null

  const doSave = useCallback(async () => {
    const snapshot = saveRef.current
    if (!snapshot || !snapshot.file) return
    setSaveStatus("saving")
    try {
      const result = await writeBrandFile({
        file: snapshot.file,
        content: snapshot.content,
        expectedMtime: snapshot.mtime ?? undefined,
      })
      setMtime(result.mtime)
      setSaveStatus("saved")
      // Refresh the file list so freshness + age update.
      refetchFiles()
    } catch (e) {
      const err = e as { message: string; fix?: string; code?: string }
      if (err.code === "CONFLICT") {
        setSaveStatus("conflict", { message: err.message, fix: err.fix })
        markExternalChange(true)
      } else {
        setSaveStatus("error", { message: err.message, fix: err.fix })
      }
    }
  }, [markExternalChange, refetchFiles, setMtime, setSaveStatus])

  // Debounced autosave on content change.
  useEffect(() => {
    if (saveStatus !== "dirty") return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      void doSave()
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [content, saveStatus, doSave])

  // React to brand-file-changed activity entries.
  useEffect(() => {
    if (!currentFile) return
    const recent = liveActivity.find(
      (a) =>
        a.kind === "brand-write" &&
        Array.isArray(a.filesChanged) &&
        a.filesChanged.some((f) => f.endsWith(currentFile)),
    )
    if (!recent) return
    // Only flag external change when the edit is user-dirty.
    if (saveStatus === "dirty" || saveStatus === "saving") {
      markExternalChange(true)
    } else {
      // Silent reload when the editor is clean.
      void readBrandFile(currentFile)
        .then((data) => openFile({ name: currentFile, content: data.content, mtime: data.mtime }))
        .catch(() => {
          /* silent */
        })
    }
  }, [currentFile, liveActivity, markExternalChange, openFile, saveStatus])

  // A13 / H1-45: fetch the remote version and open the diff dialog.
  // User makes an explicit Keep/Take choice from the dialog.
  const handleViewDiff = useCallback(async () => {
    if (!currentFile || diffFetching) return
    setDiffFetching(true)
    try {
      const data = await readBrandFile(currentFile)
      setRemoteContent(data.content)
      setDiffOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load /cmo's version")
    } finally {
      setDiffFetching(false)
    }
  }, [currentFile, diffFetching])

  const handleKeepLocal = useCallback(() => {
    setDiffOpen(false)
    setRemoteContent(null)
    // Dismissing the external-change banner now; user chose their edits.
    markExternalChange(false)
    toast.info("Kept your edits. Save when you're ready.")
  }, [markExternalChange])

  const handleTakeRemote = useCallback(() => {
    if (!currentFile || remoteContent === null) return
    // We already fetched the remote content when opening the dialog;
    // fetch mtime again to keep the optimistic-lock fresh before we
    // overwrite the editor.
    void readBrandFile(currentFile)
      .then((data) => {
        openFile({
          name: currentFile,
          content: remoteContent,
          mtime: data.mtime,
        })
        toast.success(`Took /cmo's version of ${currentFile}`)
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Take failed")
      })
      .finally(() => {
        setDiffOpen(false)
        setRemoteContent(null)
      })
  }, [currentFile, remoteContent, openFile])

  const handleRegenerate = useCallback(async () => {
    if (!currentFile) return
    const skill = getWriterSkill(currentFile)
    if (!skill) {
      toast.info(`${currentFile} is append-only; no skill regenerates it.`)
      return
    }
    regeneratingRef.current = true
    try {
      const res = await regenerateBrandFile(currentFile)
      regenJobIdRef.current = res.jobId
      toast.success(`/cmo queued ${skill}; the file will update when the skill completes.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed")
    } finally {
      regeneratingRef.current = false
    }
  }, [currentFile])

  // Hoist regenerating state: keep it derived from the ref for the header.
  // (Refs don't trigger re-renders; we watch the job id in activity instead.)
  const regeneratingActive =
    !!regenJobIdRef.current &&
    !liveActivity.some((a) => a.kind === "skill-run" && a.meta && typeof a.meta === "object" && "jobId" in a.meta && (a.meta as Record<string, unknown>).jobId === regenJobIdRef.current && /complete/i.test(a.summary))

  // The file list always renders (from BRAND_FILE_SPEC) even when the list
  // endpoint fails: the canonical 10 files are known client-side. Surface
  // any list error as a banner above the editor pane instead of a full-screen
  // takeover.
  const currentBrandFile: BrandFile | undefined = currentFile
    ? files?.find((f) => f.name === currentFile)
    : undefined

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="w-64 shrink-0">
        <BrandFileList
          files={files ?? []}
          currentFile={currentFile}
          onSelect={(name) => void handleSelect(name)}
          onRefresh={() => refetchFiles()}
          loading={listLoading}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {listError && (
          <div className="m-3 rounded-md border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-rose-600 dark:text-rose-400">
              Brand file list unavailable.
            </span>{" "}
            The sidebar shows the canonical 10 files; clicking one will try a fresh read.
            <button
              type="button"
              onClick={() => refetchFiles()}
              className="ml-2 underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        {!currentFile ? (
          <EmptyState
            icon={FileText}
            title="Pick a brand doc to edit"
            description="Your brand memory lives in `brand/*.md`. /cmo writes these when it runs foundation research. You can read, edit, and regenerate any of them right here."
          />
        ) : (
          <>
            <BrandFileHeader
              fileName={currentFile}
              file={currentBrandFile}
              saveStatus={saveStatus}
              saveError={saveError}
              externalChange={externalChange}
              regenerating={regeneratingActive}
              onSave={() => void doSave()}
              onRegenerate={() => void handleRegenerate()}
              onViewDiffExternal={() => void handleViewDiff()}
              onDismissExternal={() => markExternalChange(false)}
            />
            <MarkdownEditor
              value={content}
              onChange={updateContent}
              onSaveShortcut={() => void doSave()}
            />
          </>
        )}
      </div>

      {/* A13 / H1-45: diff-before-clobber dialog. The external-change
          banner routes here so the user always sees /cmo's version
          next to their edits before the editor is overwritten. */}
      <ExternalReloadDialog
        open={diffOpen}
        onOpenChange={(next) => {
          setDiffOpen(next)
          if (!next) setRemoteContent(null)
        }}
        fileName={currentFile ?? ""}
        localContent={content}
        remoteContent={remoteContent ?? ""}
        onKeepLocal={handleKeepLocal}
        onTakeRemote={handleTakeRemote}
      />
    </div>
  )
}
