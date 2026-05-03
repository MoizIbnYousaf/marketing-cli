type DisplaySignal = {
  title?: string
  authorHandle?: string | null
  canonicalUrl?: string | null
  externalId?: string | null
  content?: string | null
  hashtags?: string[] | null
}

const GENERIC_SIGNAL_TITLES = new Set([
  "tiktok by @unknown",
  "tiktok video",
  "tiktok trend",
])

function compactText(text: string): string {
  return text
    .replace(/[#*_`~>\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeHandle(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().replace(/^@/, "")
  if (trimmed.length === 0) return null
  if (trimmed.toLowerCase() === "unknown") return null
  return trimmed
}

export function extractHandleFromCanonicalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const tiktokMatch = parsed.pathname.match(/\/@([^/]+)/i)
    if (tiktokMatch?.[1]) return normalizeHandle(tiktokMatch[1])
  } catch {
    return null
  }
  return null
}

function extractTiktokVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/video\/(\d+)/i)
    if (match?.[1]) return match[1]
  } catch {
    return null
  }
  return null
}

export function getDisplayHandle(
  authorHandle: string | null | undefined,
  canonicalUrl: string | null | undefined
): string | null {
  return extractHandleFromCanonicalUrl(canonicalUrl) ?? normalizeHandle(authorHandle)
}

export function getDisplaySignalTitle(signal: DisplaySignal): string {
  const rawTitle = ((signal.title) || "").trim()
  const normalizedTitle = rawTitle.toLowerCase()
  const bestHandle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)

  if (!GENERIC_SIGNAL_TITLES.has(normalizedTitle) && rawTitle.length > 0) {
    return rawTitle
  }

  if (bestHandle) {
    const videoId = extractTiktokVideoId(signal.canonicalUrl)
    if (videoId) return `TikTok @${bestHandle} · ${videoId.slice(-6)}`
    return `TikTok by @${bestHandle}`
  }

  const contentPreview = compactText(signal.content ?? "")
  if (contentPreview.length > 0) return contentPreview.slice(0, 90)

  const hashtags = signal.hashtags ?? []
  if (hashtags.length > 0) {
    return hashtags
      .slice(0, 3)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" ")
  }

  if (GENERIC_SIGNAL_TITLES.has(normalizedTitle)) {
    const externalId = (signal.externalId ?? "").trim()
    if (externalId.length > 0) return `TikTok post · ${externalId.slice(-6)}`
    return "TikTok post"
  }

  return rawTitle || "Trending post"
}

export function getDisplaySignalSubtitle(signal: DisplaySignal): string | null {
  const contentPreview = compactText(signal.content ?? "")
  if (contentPreview.length > 0) return contentPreview.slice(0, 86)

  const hashtags = signal.hashtags ?? []
  if (hashtags.length > 0) {
    return hashtags
      .slice(0, 3)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" ")
  }

  const videoId = extractTiktokVideoId(signal.canonicalUrl)
  if (videoId) return `Video ${videoId.slice(-6)}`

  const externalId = (signal.externalId ?? "").trim()
  if (externalId.length > 0) return `Post ${externalId.slice(-6)}`

  const handle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)
  if (handle) return `@${handle}`

  return null
}
