import { describe, expect, test } from "bun:test"
import { parseAssetsMarkdown } from "../../lib/brand-assets.ts"

describe("parseAssetsMarkdown", () => {
  test("parses valid append-only asset rows", () => {
    const markdown = [
      "# Assets Log",
      "",
      "| Date | Type | File/URL | Skill | Notes |",
      "|------|------|----------|-------|-------|",
      "| 2026-04-23 | image | marketing/images/hero.png | image-gen | Homepage hero image |",
      "| 2026-04-23 | video | marketing/video/demo.mp4 | video-content | Launch demo |",
      "| 2026-04-23 | slide-deck | https://example.com/deck | frontend-slides | Investor deck |",
    ].join("\n")

    const entries = parseAssetsMarkdown(markdown)
    expect(entries).toHaveLength(3)
    expect(entries[0]?.previewKind).toBe("image")
    expect(entries[1]?.previewKind).toBe("video")
    expect(entries[2]?.previewKind).toBe("link")
  })

  test("ignores malformed rows and header separators", () => {
    const markdown = [
      "| Date | Type | File/URL | Skill | Notes |",
      "|------|------|----------|-------|-------|",
      "| malformed | only | three |",
      "| 2026-04-23 | image | marketing/images/hero.png | image-gen | Good row |",
    ].join("\n")

    const entries = parseAssetsMarkdown(markdown)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.location).toBe("marketing/images/hero.png")
  })
})
