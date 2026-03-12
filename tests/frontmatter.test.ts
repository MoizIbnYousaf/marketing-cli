import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "../src/lib/frontmatter";

describe("parseFrontmatter", () => {
  test("returns empty data for content without frontmatter", () => {
    const input = "# Hello World\nSome content.";
    const result = parseFrontmatter(input);
    expect(result.data).toEqual({});
    expect(result.body).toBe(input);
  });

  test("returns empty data for unclosed frontmatter", () => {
    const input = "---\nname: test\nNo closing delimiter";
    const result = parseFrontmatter(input);
    expect(result.data).toEqual({});
    expect(result.body).toBe(input);
  });

  test("parses simple scalar fields", () => {
    const input = `---
name: seo-content
category: copy-content
tier: must-have
---
Body content here.`;
    const result = parseFrontmatter(input);
    expect(result.data["name"]).toBe("seo-content");
    expect(result.data["category"]).toBe("copy-content");
    expect(result.data["tier"]).toBe("must-have");
    expect(result.body.trim()).toBe("Body content here.");
  });

  test("parses array fields with dash syntax", () => {
    const input = `---
reads:
  - voice-profile.md
  - keyword-plan.md
  - audience.md
writes:
  - assets.md
---
Body.`;
    const result = parseFrontmatter(input);
    expect(result.data["reads"]).toEqual([
      "voice-profile.md",
      "keyword-plan.md",
      "audience.md",
    ]);
    expect(result.data["writes"]).toEqual(["assets.md"]);
  });

  test("parses multiline folded string (>)", () => {
    const input = `---
description: >
  Create high-quality SEO content
  that ranks and reads like a human wrote it.
name: seo-content
---
Body.`;
    const result = parseFrontmatter(input);
    expect(result.data["description"]).toBe(
      "Create high-quality SEO content that ranks and reads like a human wrote it."
    );
    expect(result.data["name"]).toBe("seo-content");
  });

  test("parses multiline literal string (|)", () => {
    const input = `---
description: |
  Line one.
  Line two.
name: test
---`;
    const result = parseFrontmatter(input);
    const desc = result.data["description"] as string;
    expect(desc).toContain("Line one.");
    expect(desc).toContain("Line two.");
  });

  test("parses boolean values", () => {
    const input = `---
enabled: true
disabled: false
---`;
    const result = parseFrontmatter(input);
    expect(result.data["enabled"]).toBe(true);
    expect(result.data["disabled"]).toBe(false);
  });

  test("parses numeric values", () => {
    const input = `---
version: 2
score: 3.14
---`;
    const result = parseFrontmatter(input);
    expect(result.data["version"]).toBe(2);
    expect(result.data["score"]).toBe(3.14);
  });

  test("handles empty string", () => {
    const result = parseFrontmatter("");
    expect(result.data).toEqual({});
    expect(result.body).toBe("");
  });

  test("parses inline array syntax", () => {
    const input = `---
tags: [foo, bar, baz]
---`;
    const result = parseFrontmatter(input);
    expect(result.data["tags"]).toEqual(["foo", "bar", "baz"]);
  });

  test("parses quoted string values", () => {
    const input = `---
name: "my-skill"
label: 'My Skill'
---`;
    const result = parseFrontmatter(input);
    expect(result.data["name"]).toBe("my-skill");
    expect(result.data["label"]).toBe("My Skill");
  });

  test("handles real SKILL.md frontmatter", () => {
    const input = `---
name: seo-content
description: >
  Create high-quality, SEO-optimized content that ranks AND reads like a human
  wrote it.
category: copy-content
tier: must-have
reads:
  - voice-profile.md
  - keyword-plan.md
  - audience.md
writes:
  - assets.md
triggers:
  - blog post
  - SEO article
  - long-form content
---

# SEO Content Skill

Instructions here.`;
    const result = parseFrontmatter(input);
    expect(result.data["name"]).toBe("seo-content");
    expect(result.data["category"]).toBe("copy-content");
    expect(result.data["tier"]).toBe("must-have");
    expect(result.data["reads"]).toEqual([
      "voice-profile.md",
      "keyword-plan.md",
      "audience.md",
    ]);
    expect(result.data["writes"]).toEqual(["assets.md"]);
    expect(result.data["triggers"]).toEqual([
      "blog post",
      "SEO article",
      "long-form content",
    ]);
    expect(result.body).toContain("# SEO Content Skill");
  });

  test("skips comment lines in YAML", () => {
    const input = `---
# This is a comment
name: test
---`;
    const result = parseFrontmatter(input);
    expect(result.data["name"]).toBe("test");
  });
});
