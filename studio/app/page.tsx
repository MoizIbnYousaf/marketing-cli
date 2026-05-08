import { redirect } from "next/navigation"
import { readFile } from "node:fs/promises"
import path from "node:path"

// Filesystem state in brand/voice-profile.md changes across user sessions
// (created on first /cmo run, updated on every brand-voice run). This route
// must read it on every request, never cache. Other routes do not need this
// guard, so it lives here rather than on the root layout.
export const dynamic = "force-dynamic"

const VOICE_PROFILE_PATH = path.join(process.cwd(), "brand", "voice-profile.md")

const TEMPLATE_MARKERS = [
  "<!-- TEMPLATE -->",
  "{{PLACEHOLDER}}",
  "## Template",
]

function looksPopulated(contents: string): boolean {
  const trimmed = contents.trim()
  if (trimmed.length < 200) return false
  if (TEMPLATE_MARKERS.some((m) => trimmed.includes(m))) return false
  return true
}

async function hasRealVoiceProfile(): Promise<boolean> {
  try {
    const contents = await readFile(VOICE_PROFILE_PATH, "utf8")
    return looksPopulated(contents)
  } catch {
    return false
  }
}

export default async function RootPage() {
  const populated = await hasRealVoiceProfile()
  redirect(populated ? "/dashboard" : "/onboarding")
}
