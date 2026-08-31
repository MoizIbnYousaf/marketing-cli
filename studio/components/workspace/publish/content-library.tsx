"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import useSWR from "swr"
import {
  ArrowUpRight,
  ExternalLink,
  FileImage,
  FileVideo,
  ImageIcon,
  Maximize2,
  Play,
  Sparkles,
  X,
} from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import type { ContentAsset, ContentManifest } from "@/lib/content-manifest"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"

type ContentManifestResponse = {
  ok: true
  data: ContentManifest
}

export function ContentLibrary() {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const {
    data: manifestData,
    error: manifestError,
    isLoading: manifestLoading,
    mutate: mutateManifest,
  } = useSWR<ContentManifestResponse>(
    "/api/cmo/content/manifest",
    fetcher,
    { refreshInterval: 60_000 },
  )

  useEffect(() => {
    const events = new EventSource("/api/cmo/content/events/stream")
    events.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type?: string }
        if (
          parsed.type === "content-file-changed" ||
          parsed.type === "content-meta-changed" ||
          parsed.type === "content-reindexed"
        ) {
          void mutateManifest()
        }
      } catch {
        // Ignore keepalive/malformed frames; EventSource will reconnect itself.
      }
    }
    return () => events.close()
  }, [mutateManifest])

  const allAssets = manifestData?.data.assets ?? []
  const mediaAssets = allAssets.filter((asset) => asset.kind === "image" || asset.kind === "video")
  const imageAssets = mediaAssets.filter((asset) => asset.kind === "image")
  const videoAssets = mediaAssets.filter((asset) => asset.kind === "video")
  const selectedAsset =
    mediaAssets.find((asset) => asset.id === selectedAssetId) ?? mediaAssets[0]
  const trayAssets = selectedAsset
    ? mediaAssets.filter((asset) => asset.id !== selectedAsset.id)
    : mediaAssets

  return (
    <div className="space-y-5" data-demo-id="publish-content-library">
      <section className="relative overflow-hidden rounded-panel border border-border bg-card shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,color-mix(in_srgb,var(--gradient-mint)_35%,transparent),transparent_30%),radial-gradient(circle_at_82%_5%,color-mix(in_srgb,var(--gradient-lavender)_28%,transparent),transparent_28%)]" />
        <div className="relative grid min-h-[720px] gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                  Asset library
                </p>
                <h2 className="mt-3 max-w-3xl font-[var(--font-heading)] text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                  Review every generated image and video.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  The asset library is the visual artifact shelf. Brand memory stays in Brand; publishing decisions stay in Publish.
                </p>
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-card/85 text-center shadow-sm">
                <Metric label="Media" value={mediaAssets.length} />
                <Metric label="Images" value={imageAssets.length} />
                <Metric label="Videos" value={videoAssets.length} />
              </div>
            </div>

            <div className="relative flex min-h-[460px] flex-1 items-center justify-center overflow-hidden rounded-panel border border-border bg-surface-2 p-3 shadow-inner sm:p-5">
              <div className="absolute -left-24 -top-24 size-72 rounded-full bg-gradient-sky/35 blur-3xl" />
              <div className="absolute -bottom-28 -right-20 size-80 rounded-full bg-gradient-peach/30 blur-3xl" />
              <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-border bg-card/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Media preview
              </div>
              {selectedAsset ? (
                <MediaStage asset={selectedAsset} onExpand={() => setIsLightboxOpen(true)} />
              ) : manifestError ? (
                <div className="relative z-10 w-full max-w-xl">
                  <ErrorState
                    level="section"
                    error={manifestError}
                    onRetry={() => mutateManifest()}
                    title="Couldn't build content manifest"
                  />
                </div>
              ) : (
                <div className="relative z-10 w-full max-w-xl">
                  <EmptyState
                    icon={manifestLoading ? Sparkles : FileImage}
                    title={manifestLoading ? "Loading media" : "No images or videos yet"}
                    description="When /cmo creates images or videos in this project, they will appear here as reviewable assets."
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              {mediaAssets.length > 1 ? (
                <AssetTray
                  assets={trayAssets}
                  selectedAssetId={selectedAsset?.id ?? null}
                  onSelect={(asset) => {
                    setSelectedAssetId(asset.id)
                    setIsLightboxOpen(false)
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
                  Additional generated images and videos will appear here as a selectable tray.
                </div>
              )}
            </div>
          </div>

          <aside className="border-t border-border bg-surface-2/75 p-4 backdrop-blur xl:border-l xl:border-t-0">
            <Inspector asset={selectedAsset} mediaCount={mediaAssets.length} />
          </aside>
        </div>
      </section>

      {isLightboxOpen && selectedAsset ? (
        <MediaLightbox asset={selectedAsset} onClose={() => setIsLightboxOpen(false)} />
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 border-r border-border px-4 py-3 last:border-r-0">
      <p className="font-[var(--font-heading)] text-2xl font-light text-foreground">{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  )
}

function MediaStage({ asset, onExpand }: { asset: ContentAsset; onExpand: () => void }) {
  const href = assetHref(asset)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const handleExpand = async () => {
    if (asset.kind !== "video") {
      onExpand()
      return
    }

    const video = videoRef.current
    if (!video) {
      onExpand()
      return
    }

    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen()
        return
      }
      const webkitVideo = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
      if (webkitVideo.webkitEnterFullscreen) {
        webkitVideo.webkitEnterFullscreen()
        return
      }
    } catch {
      // Fall back to the lightbox if the browser blocks fullscreen.
    }

    onExpand()
  }

  return (
    <div className="relative z-10 w-full max-w-5xl">
      <div className="group relative overflow-hidden rounded-panel border border-border bg-card shadow-lg">
        {asset.kind === "video" ? (
          <video
            ref={videoRef}
            key={asset.id}
            src={href}
            controls
            playsInline
            preload="metadata"
            className="max-h-[62vh] w-full bg-black object-contain"
            onDoubleClick={() => void handleExpand()}
          />
        ) : (
          <Image
            src={href}
            alt={assetTitle(asset)}
            width={1600}
            height={900}
            unoptimized
            className="max-h-[62vh] w-full object-contain"
            loading="eager"
            decoding="async"
          />
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleExpand()}
          className="absolute right-3 top-3 bg-black/75 text-xs text-white opacity-0 shadow-lg backdrop-blur hover:bg-black/90 hover:text-white group-hover:opacity-100 focus:opacity-100"
        >
          <Maximize2 className="size-3.5" />
          {asset.kind === "video" ? "Fullscreen video" : "Open full preview"}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{assetTitle(asset)}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {asset.kind} · {assetSourceLabel(asset)} · {assetDateLabel(asset)}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition duration-150 hover:bg-secondary hover:text-foreground"
        >
          Open file
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function AssetTray({
  assets,
  selectedAssetId,
  onSelect,
}: {
  assets: ContentAsset[]
  selectedAssetId: string | null
  onSelect: (asset: ContentAsset) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto rounded-2xl border border-border bg-surface-2 p-3">
      {assets.map((asset) => (
        <AssetTile
          key={asset.id}
          asset={asset}
          isSelected={asset.id === selectedAssetId}
          onSelect={() => onSelect(asset)}
        />
      ))}
    </div>
  )
}

function AssetTile({
  asset,
  isSelected,
  onSelect,
}: {
  asset: ContentAsset
  isSelected: boolean
  onSelect: () => void
}) {
  const href = assetHref(asset)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group grid w-56 shrink-0 grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border bg-card p-2 text-left transition duration-150 hover:-translate-y-0.5 hover:border-input hover:shadow-sm",
        isSelected ? "border-primary ring-1 ring-primary/20" : "border-border",
      )}
    >
      <span className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-3">
        {asset.kind === "image" ? (
          <Image
            src={href}
            alt={assetTitle(asset)}
            width={320}
            height={320}
            unoptimized
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,var(--gradient-mint),transparent_68%)]">
            <Play className="size-6 text-foreground" />
          </span>
        )}
      </span>
      <span className="min-w-0 py-1">
        <span className="line-clamp-2 text-xs font-medium text-foreground">
          {assetTitle(asset)}
        </span>
        <span className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {asset.kind === "video" ? <FileVideo className="size-3" /> : <ImageIcon className="size-3" />}
          {assetTypeLabel(asset)}
        </span>
      </span>
    </button>
  )
}

function Inspector({ asset, mediaCount }: { asset?: ContentAsset; mediaCount: number }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-foreground" />
          <h3 className="text-sm font-semibold">Asset inspector</h3>
        </div>
        {asset ? (
          <div className="mt-4 space-y-3 text-sm">
            <InspectorRow label="Selected" value={assetTitle(asset)} />
            <InspectorRow label="Kind" value={asset.kind} />
            <InspectorRow label="Source" value={assetSourceLabel(asset)} />
            <InspectorRow label="Logged" value={assetDateLabel(asset)} />
            <InspectorRow label="File" value={asset.relativePath} />
            <InspectorRow label="Size" value={formatBytes(asset.sizeBytes)} />
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The library becomes useful as soon as /cmo generates media for this project.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <FileImage className="size-4 text-foreground" />
          <h3 className="text-sm font-semibold">Pipeline handoff</h3>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-gradient-mint/25 p-3">
          <p className="text-xs font-medium text-foreground">Asset library is review-only</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Use Brand for markdown memory and Publish for drafts, previews, scheduling, and Postiz/native execution.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href="/dashboard?tab=brand"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Brand memory
            <ArrowUpRight className="size-3" />
          </a>
          <a
            href="/dashboard?tab=publish"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Publish
            <ArrowUpRight className="size-3" />
          </a>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3">
          <p className="font-[var(--font-heading)] text-2xl font-light">{mediaCount}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">reviewable media assets</p>
        </div>
      </Card>
    </div>
  )
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 border-b border-border pb-2 last:border-b-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-foreground" title={value}>{value}</span>
    </div>
  )
}

function MediaLightbox({ asset, onClose }: { asset: ContentAsset; onClose: () => void }) {
  const href = assetHref(asset)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close media preview"
        onClick={onClose}
        className="absolute right-5 top-5 inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <div className="w-full max-w-6xl">
        {asset.kind === "video" ? (
          <video
            key={asset.id}
            src={href}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-[82vh] w-full rounded-3xl border border-white/10 bg-black object-contain shadow-2xl"
          />
        ) : (
          <Image
            src={href}
            alt={assetTitle(asset)}
            width={1600}
            height={900}
            unoptimized
            className="max-h-[82vh] w-full rounded-3xl border border-white/10 bg-black object-contain shadow-2xl"
            decoding="async"
          />
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">{assetTitle(asset)}</p>
      </div>
    </div>
  )
}

function assetHref(asset: ContentAsset): string {
  if (asset.mediaUrl) return asset.mediaUrl
  if (asset.isExternal) return asset.relativePath
  return `/api/cmo/content/media?path=${encodeURIComponent(asset.relativePath)}`
}

function assetLabel(path: string): string {
  return path.split("/").pop() || "asset"
}

function assetTitle(asset: ContentAsset): string {
  return asset.notes || asset.title || assetLabel(asset.relativePath)
}

function assetSourceLabel(asset: ContentAsset): string {
  return asset.source?.skill || asset.source?.kind || "filesystem"
}

function assetTypeLabel(asset: ContentAsset): string {
  return asset.source?.type || asset.kind
}

function assetDateLabel(asset: ContentAsset): string {
  if (asset.source?.date) return asset.source.date
  if (!asset.mtimeMs) return "external"
  return new Date(asset.mtimeMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatBytes(value: number | undefined): string {
  if (!value) return "-"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
