import { promises as fs } from "node:fs"
import path from "node:path"
import { FileText, AlertTriangle } from "lucide-react"

// Max time we let fs.stat block the settings render. The G1 audit saw
// Playwright's 30s screenshot timeout fire at 1920/2560 because this
// async server component awaited 10 fs.stat calls that can stall on slow
// disks or large brand dirs. 3s is more than enough for local stat, and
// gives us a clean fallback path when it isn't.
const READ_BUDGET_MS = 3_000

interface BrandFileSpec {
  file: string
  label: string
  freshnessDays: number
  description: string
}

const BRAND_FILES: BrandFileSpec[] = [
  { file: "voice-profile.md", label: "Voice profile", freshnessDays: 30, description: "Tone, vocabulary, personality" },
  { file: "audience.md", label: "Audience", freshnessDays: 30, description: "Buyer personas, watering holes" },
  { file: "positioning.md", label: "Positioning", freshnessDays: 30, description: "Market angle, differentiators" },
  { file: "competitors.md", label: "Competitors", freshnessDays: 30, description: "Rival profiles + gaps" },
  { file: "landscape.md", label: "Landscape", freshnessDays: 14, description: "Ecosystem snapshot + Claims Blacklist" },
  { file: "keyword-plan.md", label: "Keyword plan", freshnessDays: 90, description: "Target keywords + intent" },
  { file: "creative-kit.md", label: "Creative kit", freshnessDays: 180, description: "Visual identity, design tokens" },
  { file: "stack.md", label: "Stack", freshnessDays: 180, description: "Marketing tools in use" },
  { file: "assets.md", label: "Assets", freshnessDays: Infinity, description: "Content inventory (append-only)" },
  { file: "learnings.md", label: "Learnings", freshnessDays: Infinity, description: "What worked (append-only)" },
]

type BrandStatus = "populated" | "missing" | "stale" | "empty"

interface BrandFileStats {
  spec: BrandFileSpec
  status: BrandStatus
  sizeBytes: number
  mtime: Date | null
  ageDays: number | null
}

async function readBrandStats(): Promise<BrandFileStats[]> {
  const brandDir = path.join(process.cwd(), "brand")
  return Promise.all(
    BRAND_FILES.map(async (spec): Promise<BrandFileStats> => {
      const fullPath = path.join(brandDir, spec.file)
      try {
        const stat = await fs.stat(fullPath)
        const ageMs = Date.now() - stat.mtimeMs
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        if (stat.size < 80) {
          return { spec, status: "empty", sizeBytes: stat.size, mtime: stat.mtime, ageDays }
        }
        if (Number.isFinite(spec.freshnessDays) && ageDays > spec.freshnessDays) {
          return { spec, status: "stale", sizeBytes: stat.size, mtime: stat.mtime, ageDays }
        }
        return { spec, status: "populated", sizeBytes: stat.size, mtime: stat.mtime, ageDays }
      } catch {
        return { spec, status: "missing", sizeBytes: 0, mtime: null, ageDays: null }
      }
    }),
  )
}

function statusDotClass(status: BrandStatus): string {
  switch (status) {
    case "populated":
      return "bg-emerald-500"
    case "stale":
      return "bg-amber-500"
    case "empty":
      return "bg-amber-500/60"
    case "missing":
      return "bg-rose-500/60"
  }
}

function statusLabel(status: BrandStatus): string {
  switch (status) {
    case "populated":
      return "Fresh"
    case "stale":
      return "Stale"
    case "empty":
      return "Template"
    case "missing":
      return "Missing"
  }
}

function ageLabel(stats: BrandFileStats): string {
  if (stats.status === "missing") return "—"
  if (stats.ageDays === null) return "—"
  if (stats.ageDays < 1) return "today"
  if (stats.ageDays < 2) return "yesterday"
  if (stats.ageDays < 30) return `${Math.floor(stats.ageDays)}d ago`
  if (stats.ageDays < 365) return `${Math.floor(stats.ageDays / 30)}mo ago`
  return `${Math.floor(stats.ageDays / 365)}y ago`
}

function renderError(message: string) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Brand file scan unavailable</p>
        <p className="text-muted-foreground/80">{message}</p>
      </div>
    </div>
  )
}

export async function BrandHealthSection() {
  // Race the fs scan against a short budget. Any failure mode (stall on
  // slow disk, permission error, huge brand/ dir at wider viewports that
  // delays Next's RSC stream past Playwright's 30s timeout — G1 F25/F43)
  // falls through to an inline error card instead of blocking or crashing
  // the whole Settings page.
  let stats: BrandFileStats[]
  try {
    stats = await Promise.race([
      readBrandStats(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`brand/ scan exceeded ${READ_BUDGET_MS}ms budget`)),
          READ_BUDGET_MS,
        ),
      ),
    ])
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return renderError(message)
  }
  const populated = stats.filter((s) => s.status === "populated").length
  const stale = stats.filter((s) => s.status === "stale").length
  const missing = stats.filter((s) => s.status === "missing" || s.status === "empty").length

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Brand file health</h2>
          <p className="text-xs text-muted-foreground">
            Read live from{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">brand/</code>. Stale
            files still work — /cmo will flag them when a skill needs fresh data.
          </p>
        </div>
        <div className="hidden gap-1 text-[11px] text-muted-foreground md:flex">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
            {populated} fresh
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600">
            {stale} stale
          </span>
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600">
            {missing} missing
          </span>
        </div>
      </header>

      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70 bg-background/60">
        {stats.map((s) => (
          <li
            key={s.spec.file}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`size-2 shrink-0 rounded-full ${statusDotClass(s.status)}`}
                title={statusLabel(s.status)}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{s.spec.label}</p>
                  <code className="font-mono text-[11px] text-muted-foreground">
                    {s.spec.file}
                  </code>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.spec.description}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-muted-foreground">
                {statusLabel(s.status)}
              </p>
              <p className="text-[11px] text-muted-foreground/80">{ageLabel(s)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
