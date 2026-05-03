"use client"

import { memo } from "react"
import { FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BRAND_FILE_SPEC,
  computeFreshness,
  relativeAge,
  sortBrandFiles,
  type BrandFile,
  type BrandFreshness,
} from "@/lib/brand-editor"

function freshnessDot(status: BrandFreshness): { cls: string; label: string } {
  switch (status) {
    case "fresh":
      return { cls: "bg-emerald-500", label: "Fresh" }
    case "stale":
      return { cls: "bg-amber-500", label: "Stale" }
    case "empty":
    case "template":
      return { cls: "bg-amber-500/60", label: "Template" }
    case "missing":
      return { cls: "bg-rose-500/60", label: "Missing" }
  }
}

interface BrandFileListProps {
  files: BrandFile[]
  currentFile: string | null
  onSelect: (name: string) => void
  onRefresh?: () => void
  loading?: boolean
}

/**
 * Left sidebar for the Brand tab. Lists the 10 canonical files (merging in
 * any extras the server returns) and shows per-file freshness + last-updated.
 */
function BrandFileListImpl({
  files,
  currentFile,
  onSelect,
  onRefresh,
  loading,
}: BrandFileListProps) {
  // Merge server files with the canonical spec so missing files still show.
  const byName = new Map<string, BrandFile>()
  for (const f of files) byName.set(f.name, f)
  const canonical: BrandFile[] = Object.keys(BRAND_FILE_SPEC).map((name) => {
    const present = byName.get(name)
    if (present) return present
    return { name, bytes: 0, mtime: "", freshness: "missing" as const }
  })
  const extras: BrandFile[] = [...byName.values()].filter(
    (f) => !BRAND_FILE_SPEC[f.name],
  )
  const merged = sortBrandFiles([...canonical, ...extras])

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border/60 bg-muted/10">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Brand docs</span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {merged.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh brand files"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              title="Refresh"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            </button>
          )}
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto overflow-x-hidden">
        {merged.map((file) => {
          const spec = BRAND_FILE_SPEC[file.name]
          const status = computeFreshness(file)
          const dot = freshnessDot(status)
          const active = currentFile === file.name
          const age = file.mtime ? relativeAge(file.mtime) : "-"
          return (
            <li key={file.name}>
              <button
                type="button"
                onClick={() => onSelect(file.name)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col items-start gap-1 border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                  active
                    ? "border-l-accent bg-accent/10"
                    : "border-l-transparent hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn("size-2 shrink-0 rounded-full", dot.cls)}
                    title={dot.label}
                    aria-label={dot.label}
                  />
                  <span className="truncate text-sm font-medium">
                    {spec?.label ?? file.name.replace(/\.md$/, "")}
                  </span>
                </div>
                <div className="flex w-full items-center justify-between gap-2 pl-4">
                  <code className="truncate font-mono text-[10px] text-muted-foreground/80">
                    {file.name}
                  </code>
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                    {age}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

    </aside>
  )
}

export const BrandFileList = memo(BrandFileListImpl)
