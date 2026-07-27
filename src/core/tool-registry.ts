// mktg — Canonical CLI tool registry
// Single source for doctor's ecosystem checks AND skill prerequisite
// resolution, so remediation strings never drift between the two.

export type ToolRegistryEntry = {
  readonly name: string;
  readonly required: boolean;
  readonly installHint?: string;
};

export const TOOL_REGISTRY: readonly ToolRegistryEntry[] = [
  { name: "bun", required: true, installHint: "curl -fsSL https://bun.sh/install | bash" },
  { name: "gws", required: false, installHint: "npm i -g gws" },
  { name: "playwright-cli", required: false, installHint: "npm i -g @playwright/cli" },
  { name: "ffmpeg", required: false, installHint: "brew install ffmpeg" },
  { name: "remotion", required: false, installHint: "npm i -g @remotion/cli" },
  { name: "firecrawl", required: false, installHint: "npm i -g firecrawl" },
  { name: "whisper-cpp", required: false, installHint: "brew install whisper-cpp" },
  { name: "yt-dlp", required: false, installHint: "brew install yt-dlp" },
  { name: "summarize", required: false, installHint: "npm i -g @steipete/summarize" },
  { name: "gh", required: false, installHint: "brew install gh" },
  { name: "gh-axi", required: false, installHint: "npm i -g gh-axi   # or: npx -y gh-axi  (see /axi)" },
  { name: "chrome-devtools-axi", required: false, installHint: "npm i -g chrome-devtools-axi   # or: npx -y chrome-devtools-axi  (see /axi)" },
  { name: "higgsfield", required: false, installHint: "npm i -g @higgsfield/cli && higgsfield auth login" },
] as const;

export const toolInstallHint = (name: string): string | undefined =>
  TOOL_REGISTRY.find(t => t.name === name)?.installHint;

export const toolAvailable = (name: string): boolean => Bun.which(name) !== null;
