export function getFaviconUrl(url: string, size = 16): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const host = parsed.hostname
    if (!host) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
  } catch {
    return null
  }
}
