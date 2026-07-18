/**
 * Shared copy for Postiz empty / degraded states.
 * Postiz is optional - mktg-native covers the local queue without it.
 */

export type PostizEmptyKind = "providers" | "queue" | "calendar"

export function postizOptionalEmpty(
  kind: PostizEmptyKind,
  degradedReason?: string | null,
): { title: string; description: string } {
  const title = "Postiz not configured (optional)"
  if (degradedReason) return { title, description: degradedReason }

  if (kind === "providers") {
    return {
      title,
      description:
        "Add POSTIZ_API_KEY in Settings to connect 30+ social providers. Until then, use the mktg-native adapter for local queue/history.",
    }
  }

  const surface = kind === "calendar" ? "calendar" : "queue"
  return {
    title,
    description: `Switch to mktg-native for the local ${surface}, or add POSTIZ_API_KEY in Settings to use Postiz.`,
  }
}
