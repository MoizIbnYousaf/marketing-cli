"use client"

import { AlertTriangle, Check, FileText, Loader2, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BRAND_FILE_SPEC,
  getWriterSkill,
  relativeAge,
  type BrandFile,
} from "@/lib/brand-editor"
import type { SaveStatus } from "@/lib/stores/brand-editor"

interface BrandFileHeaderProps {
  fileName: string
  file?: BrandFile
  saveStatus: SaveStatus
  saveError?: { message: string; fix?: string } | null
  externalChange: boolean
  regenerating: boolean
  onSave: () => void
  onRegenerate: () => void
  /**
   * Safe path: opens the diff dialog so the user can see /cmo's
   * version next to their edits before deciding. A13 / H1-45
   * mandates that the reload never silently clobbers.
   */
  onViewDiffExternal: () => void
  onDismissExternal: () => void
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }
  if (status === "saved" || status === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
        <Check className="size-3" />
        Saved
      </span>
    )
  }
  if (status === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Unsaved
      </span>
    )
  }
  if (status === "conflict") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-700 dark:text-rose-400">
        <AlertTriangle className="size-3" />
        Conflict
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/5 px-2 py-0.5 text-[11px] text-rose-600">
      <AlertTriangle className="size-3" />
      Save failed
    </span>
  )
}

export function BrandFileHeader({
  fileName,
  file,
  saveStatus,
  saveError,
  externalChange,
  regenerating,
  onSave,
  onRegenerate,
  onViewDiffExternal,
  onDismissExternal,
}: BrandFileHeaderProps) {
  const spec = BRAND_FILE_SPEC[fileName]
  const writer = getWriterSkill(fileName)
  const mtimeLabel = file?.mtime ? relativeAge(file.mtime) : "-"
  const canSave = saveStatus === "dirty" || saveStatus === "error"

  return (
    <header className="flex flex-col gap-2 border-b border-border/60 bg-background/80 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h1 className="font-display text-base font-semibold tracking-tight">
              {spec?.label ?? fileName.replace(/\.md$/, "")}
            </h1>
            <code className="font-mono text-[11px] text-muted-foreground">
              {fileName}
            </code>
          </div>
          {spec?.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {spec.description}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            Updated {mtimeLabel}
            {writer && (
              <>
                {" · "}
                <span className="font-mono">{writer}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SaveBadge status={saveStatus} />

          {writer && (
            <Button
              type="button"
              onClick={onRegenerate}
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={regenerating}
              title={`Re-run ${writer}`}
            >
              {regenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Regenerate
            </Button>
          )}

          <Button
            type="button"
            onClick={onSave}
            size="sm"
            className={cn("gap-1.5", !canSave && "opacity-60")}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Wand2 className="size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {saveError && (saveStatus === "error" || saveStatus === "conflict") && (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-500/80" />
          <div className="min-w-0 flex-1">
            <p className="text-rose-700 dark:text-rose-400">{saveError.message}</p>
            {saveError.fix && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">Fix: {saveError.fix}</p>
            )}
          </div>
        </div>
      )}

      {externalChange && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
        >
          <p className="text-amber-700 dark:text-amber-400">
            /cmo rewrote this file while you were editing. Your in-progress edits
            are still intact until you choose what to do.
          </p>
          {/* A13 / H1-45: never clobber silently. The banner now always
              routes through the diff dialog where the user picks
              explicitly. "Keep my edits" just closes the banner; "See
              the diff" opens the side-by-side + Keep/Take choice. */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={onDismissExternal}>
              Keep my edits
            </Button>
            <Button size="sm" onClick={onViewDiffExternal}>
              See the diff
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
