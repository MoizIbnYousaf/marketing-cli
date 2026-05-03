export function resolveStudioApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_STUDIO_API_BASE?.replace(/\/$/, "")
  if (explicit) return explicit
  return ""
}
