"use client"

import { useMemo } from "react"
import { ExternalLink, FileImage, Film, FolderOpen, Link2 } from "lucide-react"
import { parseAssetsMarkdown, type BrandAssetEntry } from "@/lib/brand-assets"

interface AssetBoardProps {
  content: string
}

function previewHref(entry: BrandAssetEntry): string {
  if (entry.isExternal) return entry.location
  return `/api/assets/file?path=${encodeURIComponent(entry.location)}`
}

function AssetCard({ entry }: { entry: BrandAssetEntry }) {
  const href = previewHref(entry)
  const showImage = entry.previewKind === "image"
  const showVideo = entry.previewKind === "video"

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm transition hover:border-accent/60 hover:shadow-md">
      <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(214,171,100,0.16),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {entry.type}
            </p>
            <h3 className="mt-2 font-[var(--font-heading)] text-xl font-semibold tracking-tight text-foreground">
              {entry.notes || entry.location.split("/").pop() || entry.location}
            </h3>
          </div>
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {entry.skill}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {(showImage || showVideo) ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            {showImage ? (
              <img
                src={href}
                alt={entry.notes || entry.location}
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            ) : (
              <video
                src={href}
                controls
                className="aspect-[16/9] h-auto w-full bg-black object-cover"
              />
            )}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col justify-between rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {entry.previewKind === "link" ? (
                <Link2 className="size-4 text-muted-foreground" />
              ) : (
                <FolderOpen className="size-4 text-muted-foreground" />
              )}
              {entry.previewKind === "link" ? "External asset" : "Project asset"}
            </div>
            <p className="font-mono text-xs text-muted-foreground break-all">{entry.location}</p>
          </div>
        )}

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Date:</span> {entry.date}
          </div>
          <div>
            <span className="font-medium text-foreground">Source:</span>{" "}
            {entry.isExternal ? "external URL" : "project file"}
          </div>
        </div>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
        >
          <ExternalLink className="size-4" />
          Open asset
        </a>
      </div>
    </article>
  )
}

export function AssetBoard({ content }: AssetBoardProps) {
  const entries = useMemo(() => parseAssetsMarkdown(content), [content])
  const images = entries.filter((entry) => entry.previewKind === "image").length
  const videos = entries.filter((entry) => entry.previewKind === "video").length

  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border/70 bg-background">
            <FileImage className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
            Asset board is empty
          </h3>
          <p className="text-sm text-muted-foreground">
            `/cmo` and the content skills append entries to `brand/assets.md`. As soon as that log has rows, the studio turns them into a visual board here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(214,171,100,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01))] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Live asset board
        </p>
        <h2 className="mt-3 max-w-3xl font-[var(--font-heading)] text-3xl font-semibold tracking-tight text-foreground">
          Assets should read like launch material, not a file dump.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          This board visualizes the append-only `brand/assets.md` log so generated images, videos, decks, and links are visible as soon as they land.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
            <span className="font-medium text-foreground">{entries.length}</span> total assets
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
            <span className="font-medium text-foreground">{images}</span> image previews
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
            <span className="font-medium text-foreground">{videos}</span> video previews
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {entries.map((entry) => (
          <AssetCard key={entry.id} entry={entry} />
        ))}
      </section>
    </div>
  )
}
