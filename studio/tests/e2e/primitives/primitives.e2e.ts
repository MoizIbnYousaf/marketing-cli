// tests/e2e/primitives/primitives.e2e.ts -- Lane 6 E2E.
//
// Renders every CVA variant of every primitive at /dev-test/primitives and
// asserts:
//   1. The generated className string contains the expected Tailwind
//      utilities (no snapshots -- each utility checked individually).
//   2. shadcn primitives reference REAL @theme tokens: getComputedStyle
//      returns the rgb() values that match globals.css hex literals.
//   3. EmptyState + ErrorState render across every variant/level with
//      correct DOM structure and computed colors.
//
// Tier 1 hard rules: no mocks, no fake data. Real Next.js dev server (boot
// via global-setup.ts), real Tailwind v4 generation, real getComputedStyle.
//
// All assertions run inside ONE test because Playwright's per-test page
// reload combined with the dashboard's SSEBridge / Turbopack dev quirks
// caused ECONNREFUSED on the second navigation. Single navigation +
// soft-expect collection sidesteps that and still gives us per-variant
// pass/fail granularity in the assertion log.

import { test, expect, type Page } from "@playwright/test"
import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPORT_PATH = join(__dirname, "REPORT.md")

const TOKEN_HEX = {
  "bg-card": "#171d21",
  "bg-popover": "#1d2429",
  "bg-surface-1": "#171d21",
  "bg-surface-2": "#1d2429",
  "bg-surface-3": "#232a30",
  "border-input": "#1d252b",
  "bg-background": "#11161a",
} as const

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

type ComputedDump = {
  testId: string
  className: string
  backgroundColor: string
  color: string
  borderColor: string
  borderTopLeftRadius: string
  minHeight?: string
  minWidth?: string
}

async function dumpComputed(
  page: Page,
  testId: string,
): Promise<ComputedDump> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`)
    if (!el) throw new Error(`testid not found: ${id}`)
    const cs = window.getComputedStyle(el)
    return {
      testId: id,
      className: el.getAttribute("class") ?? "",
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderColor,
      borderTopLeftRadius: cs.borderTopLeftRadius,
      minHeight: cs.minHeight,
      minWidth: cs.minWidth,
    }
  }, testId)
}

const CARD_RADII = ["panel", "card", "chip"] as const
const CARD_SURFACES = ["default", "subtle", "elevated"] as const
const SKELETON_SHAPES = ["rect", "text", "circle", "card"] as const
const BUTTON_SIZES = [
  "default",
  "xs",
  "sm",
  "lg",
  "touch",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const
const BUTTON_VARIANTS = [
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
  "accent",
] as const
const FIELD_SIZES = ["sm", "default", "lg"] as const
const INPUT_INTENTS = ["default", "error", "success"] as const
const LABEL_INTENTS = ["default", "muted", "error"] as const

test.describe("Lane 6 -- Primitives variant coverage", () => {
  test("All primitives + tokens", async ({ page }) => {
    test.setTimeout(120_000)
    mkdirSync(__dirname, { recursive: true })

    await page.goto("/dev-test/primitives", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("harness-heading")).toHaveText(
      "Primitives variant matrix (Lane 6 E2E)",
    )

    const dumps: ComputedDump[] = []
    const results: Array<{
      group: string
      id: string
      passed: boolean
      reason?: string
    }> = []

    function record(
      group: string,
      id: string,
      check: () => void | Promise<void>,
    ): Promise<void> {
      return Promise.resolve(check())
        .then(() => {
          results.push({ group, id, passed: true })
        })
        .catch((err: unknown) => {
          const reason = err instanceof Error ? err.message : String(err)
          results.push({ group, id, passed: false, reason })
        })
    }

    // ─── Card: 9 combos ───
    for (const radius of CARD_RADII) {
      for (const surface of CARD_SURFACES) {
        const id = `card-${radius}-${surface}`
        await record("Card", id, async () => {
          const dump = await dumpComputed(page, id)
          dumps.push(dump)
          expect(dump.className, id).toContain(`rounded-${radius}`)
          const surfaceUtility =
            surface === "default"
              ? "bg-card"
              : surface === "subtle"
                ? "bg-surface-1"
                : "bg-surface-3"
          expect(dump.className, id).toContain(surfaceUtility)
          expect(
            await page.getByTestId(id).getAttribute("data-radius"),
            id,
          ).toBe(radius)
          expect(
            await page.getByTestId(id).getAttribute("data-surface"),
            id,
          ).toBe(surface)
          const radiusPx =
            radius === "panel"
              ? "25.6px"
              : radius === "card"
                ? "16px"
                : "12px"
          expect(dump.borderTopLeftRadius, id).toBe(radiusPx)
          const expectedBg =
            surface === "default"
              ? hexToRgb(TOKEN_HEX["bg-card"])
              : surface === "subtle"
                ? hexToRgb(TOKEN_HEX["bg-surface-1"])
                : hexToRgb(TOKEN_HEX["bg-surface-3"])
          expect(dump.backgroundColor, id).toBe(expectedBg)
        })
      }
    }

    // ─── Skeleton: 4 shapes ───
    for (const shape of SKELETON_SHAPES) {
      const id = `skeleton-${shape}`
      await record("Skeleton", id, async () => {
        const dump = await dumpComputed(page, id)
        dumps.push(dump)
        expect(dump.className, id).toContain("animate-pulse")
        expect(dump.className, id).toContain("bg-accent")
        if (shape === "circle") {
          expect(dump.className, id).toContain("rounded-full")
        } else if (shape === "card") {
          expect(dump.className, id).toContain("rounded-xl")
          expect(dump.className, id).toContain("h-24")
        } else {
          expect(dump.className, id).toContain("rounded-md")
        }
        expect(
          await page.getByTestId(id).getAttribute("data-shape"),
          id,
        ).toBe(shape)
      })
    }

    // ─── Button: 63 combos ───
    for (const size of BUTTON_SIZES) {
      for (const variant of BUTTON_VARIANTS) {
        const id = `button-${size}-${variant}`
        await record("Button", id, async () => {
          const dump = await dumpComputed(page, id)
          dumps.push(dump)
          expect(
            await page.getByTestId(id).getAttribute("data-size"),
            id,
          ).toBe(size)
          expect(
            await page.getByTestId(id).getAttribute("data-variant"),
            id,
          ).toBe(variant)

          if (variant === "default") {
            expect(dump.className, id).toContain("bg-primary")
          } else if (variant === "destructive") {
            expect(dump.className, id).toContain("bg-destructive")
          } else if (variant === "outline") {
            expect(dump.className, id).toContain("border")
            expect(dump.className, id).toContain("bg-background")
          } else if (variant === "secondary") {
            expect(dump.className, id).toContain("bg-secondary")
          } else if (variant === "ghost") {
            expect(dump.className, id).toContain("hover:bg-accent")
          } else if (variant === "link") {
            expect(dump.className, id).toContain("text-primary")
            expect(dump.className, id).toContain("underline-offset-4")
          } else if (variant === "accent") {
            expect(dump.className, id).toContain("bg-accent")
          }

          if (size === "default") expect(dump.className, id).toContain("h-9")
          if (size === "xs") expect(dump.className, id).toContain("h-6")
          if (size === "sm") expect(dump.className, id).toContain("h-8")
          if (size === "lg") expect(dump.className, id).toContain("h-10")
          if (size === "touch") {
            expect(dump.className, id).toContain("min-h-11")
            expect(dump.className, id).toContain("min-w-11")
            expect(
              parseFloat(dump.minHeight ?? "0"),
              id,
            ).toBeGreaterThanOrEqual(44)
            expect(
              parseFloat(dump.minWidth ?? "0"),
              id,
            ).toBeGreaterThanOrEqual(44)
          }
          if (size === "icon") expect(dump.className, id).toContain("size-9")
          if (size === "icon-xs")
            expect(dump.className, id).toContain("size-6")
          if (size === "icon-sm")
            expect(dump.className, id).toContain("size-8")
          if (size === "icon-lg")
            expect(dump.className, id).toContain("size-10")
        })
      }
    }

    // ─── Input: 9 combos ───
    for (const size of FIELD_SIZES) {
      for (const intent of INPUT_INTENTS) {
        const id = `input-${size}-${intent}`
        await record("Input", id, async () => {
          const dump = await dumpComputed(page, id)
          dumps.push(dump)
          expect(
            await page.getByTestId(id).getAttribute("data-size"),
            id,
          ).toBe(size)
          expect(
            await page.getByTestId(id).getAttribute("data-intent"),
            id,
          ).toBe(intent)
          if (size === "sm") expect(dump.className, id).toContain("h-8")
          if (size === "default") expect(dump.className, id).toContain("h-9")
          if (size === "lg") expect(dump.className, id).toContain("h-10")
          if (intent === "error")
            expect(dump.className, id).toContain("border-destructive")
          if (intent === "success")
            expect(dump.className, id).toContain("border-success/60")
          // Default-intent baseline carries border-input. Error/success
          // intents replace it via tailwind-merge dedup -- expected behavior.
          if (intent === "default")
            expect(dump.className, id).toContain("border-input")
        })
      }
    }

    // ─── Textarea: 9 combos ───
    for (const size of FIELD_SIZES) {
      for (const intent of INPUT_INTENTS) {
        const id = `textarea-${size}-${intent}`
        await record("Textarea", id, async () => {
          const dump = await dumpComputed(page, id)
          dumps.push(dump)
          expect(
            await page.getByTestId(id).getAttribute("data-size"),
            id,
          ).toBe(size)
          expect(
            await page.getByTestId(id).getAttribute("data-intent"),
            id,
          ).toBe(intent)
          if (size === "sm") expect(dump.className, id).toContain("min-h-12")
          if (size === "default")
            expect(dump.className, id).toContain("min-h-16")
          if (size === "lg") expect(dump.className, id).toContain("min-h-24")
          if (intent === "error")
            expect(dump.className, id).toContain("border-destructive")
          if (intent === "success")
            expect(dump.className, id).toContain("border-success/60")
          // tailwind-merge correctly dedups border-input on error/success.
          if (intent === "default")
            expect(dump.className, id).toContain("border-input")
        })
      }
    }

    // ─── Label: 9 combos ───
    for (const size of FIELD_SIZES) {
      for (const intent of LABEL_INTENTS) {
        const id = `label-${size}-${intent}`
        await record("Label", id, async () => {
          const dump = await dumpComputed(page, id)
          dumps.push(dump)
          if (size === "sm") expect(dump.className, id).toContain("text-xs")
          if (size === "default")
            expect(dump.className, id).toContain("text-sm")
          if (size === "lg") expect(dump.className, id).toContain("text-base")
          if (intent === "default")
            expect(dump.className, id).toContain("text-foreground")
          if (intent === "muted")
            expect(dump.className, id).toContain("text-muted-foreground")
          if (intent === "error")
            expect(dump.className, id).toContain("text-destructive")
        })
      }
    }

    // ─── EmptyState ───
    for (const variant of ["card", "centered"] as const) {
      const id = `empty-state-${variant}-wrap`
      await record("EmptyState", id, async () => {
        const wrap = page.getByTestId(id)
        await expect(wrap, id).toBeVisible()
        await expect(wrap, id).toContainText(`${variant} variant title`)
        await expect(wrap, id).toContainText(`${variant} variant description`)
      })
    }

    // ─── ErrorState ───
    for (const level of ["section", "tab", "page"] as const) {
      const id = `error-state-${level}-wrap`
      await record("ErrorState", id, async () => {
        const wrap = page.getByTestId(id)
        await expect(wrap, id).toBeVisible()
        await expect(wrap, id).toContainText(`${level} title`)
        await expect(wrap, id).toContainText(
          `${level} level synthetic error`,
        )
        await expect(
          wrap.locator('button:has-text("Retry")'),
          `${id} retry`,
        ).toBeVisible()
        expect(
          await wrap.locator('[role="alert"]').count(),
          `${id} role=alert`,
        ).toBeGreaterThan(0)
      })
    }

    // ─── Token probes ───
    for (const [util, hex] of Object.entries(TOKEN_HEX)) {
      const id = `token-${util}`
      await record("Token", id, async () => {
        const dump = await dumpComputed(page, id)
        dumps.push(dump)
        const expected = hexToRgb(hex)
        if (util.startsWith("border-")) {
          expect(dump.borderColor, id).toBe(expected)
        } else {
          expect(dump.backgroundColor, id).toBe(expected)
        }
      })
    }

    // ─── Write REPORT.md ───
    const total = results.length
    const failed = results.filter((r) => !r.passed)
    const lines: string[] = [
      "# Lane 6 Primitives E2E Report",
      "",
      `**Run:** ${new Date().toISOString()}`,
      `**Total checks:** ${total}`,
      `**Passed:** ${total - failed.length}`,
      `**Failed:** ${failed.length}`,
      `**Computed-style probes:** ${dumps.length}`,
      "",
      "## Per-variant results",
      "",
      "| Group | testId | Result |",
      "|---|---|---|",
    ]
    for (const r of results) {
      lines.push(
        `| ${r.group} | ${r.id} | ${
          r.passed ? "✓" : `✗ ${r.reason ?? ""}`
        } |`,
      )
    }
    lines.push("", "## Token resolution", "")
    lines.push("| Token utility | Expected | Actual |")
    lines.push("|---|---|---|")
    for (const [util, hex] of Object.entries(TOKEN_HEX)) {
      const probe = dumps.find((d) => d.testId === `token-${util}`)
      const actual = util.startsWith("border-")
        ? (probe?.borderColor ?? "(missing)")
        : (probe?.backgroundColor ?? "(missing)")
      lines.push(
        `| \`${util}\` | ${hex} = ${hexToRgb(hex)} | ${actual} |`,
      )
    }
    lines.push("", "## Card matrix (3 radii × 3 surfaces)", "")
    lines.push("| testId | computed bg | computed border-radius |")
    lines.push("|---|---|---|")
    for (const r of CARD_RADII) {
      for (const s of CARD_SURFACES) {
        const id = `card-${r}-${s}`
        const d = dumps.find((x) => x.testId === id)
        lines.push(
          `| ${id} | ${d?.backgroundColor ?? "(missing)"} | ${
            d?.borderTopLeftRadius ?? "(missing)"
          } |`,
        )
      }
    }
    lines.push("", "## Raw computed-style dump", "")
    lines.push("```json")
    lines.push(JSON.stringify(dumps, null, 2))
    lines.push("```")
    writeFileSync(REPORT_PATH, lines.join("\n"))

    if (failed.length > 0) {
      throw new Error(
        `${failed.length}/${total} variant checks failed. See REPORT.md.`,
      )
    }
  })
})
