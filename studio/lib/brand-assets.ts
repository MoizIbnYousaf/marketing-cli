export type AssetPreviewKind = "image" | "video" | "link" | "file"

export interface BrandAssetEntry {
  id: string
  date: string
  type: string
  location: string
  skill: string
  notes: string
  isExternal: boolean
  previewKind: AssetPreviewKind
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"]

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function classifyPreviewKind(location: string): AssetPreviewKind {
  const lower = location.toLowerCase()
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "image"
  if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "video"
  if (isUrl(location)) return "link"
  return "file"
}

function splitMarkdownRow(line: string): string[] | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null
  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim())
  return cells.length >= 5 ? cells : null
}

export function parseAssetsMarkdown(markdown: string): BrandAssetEntry[] {
  const lines = markdown.split(/\r?\n/)
  const entries: BrandAssetEntry[] = []

  for (const line of lines) {
    const cells = splitMarkdownRow(line)
    if (!cells) continue

    const [date, type, location, skill, notes] = cells
    if (!date || !type || !location || !skill) continue

    const normalizedLocation = location.replace(/^`|`$/g, "")
    if (/^-+$/.test(date) || /^date$/i.test(date)) continue

    entries.push({
      id: `${date}-${type}-${normalizedLocation}-${skill}`.replace(/\s+/g, "-").toLowerCase(),
      date,
      type,
      location: normalizedLocation,
      skill,
      notes: notes ?? "",
      isExternal: isUrl(normalizedLocation),
      previewKind: classifyPreviewKind(normalizedLocation),
    })
  }

  return entries
}
