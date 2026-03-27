// E2E tests for composable skill orchestrator architecture
// Validates: skill files exist, cross-references are valid, data contracts are consistent,
// routing/disambiguation/redirects cover the orchestrator pattern, and DAG integrity.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import type { SkillsManifest } from "../src/types";

const rootDir = join(import.meta.dir, "..");
const manifestPath = join(rootDir, "skills-manifest.json");
const manifest: SkillsManifest = await Bun.file(manifestPath).json();

// === NEW SKILLS EXIST AND ARE WELL-FORMED ===

describe("New atomic skills", () => {
  const newSkills = ["slideshow-script", "video-content", "tiktok-slideshow"];

  for (const skill of newSkills) {
    describe(`skill: ${skill}`, () => {
      test("exists in manifest", () => {
        expect(manifest.skills).toHaveProperty(skill);
      });

      test("SKILL.md exists", async () => {
        const path = join(rootDir, "skills", skill, "SKILL.md");
        expect(await Bun.file(path).exists()).toBe(true);
      });

      test("SKILL.md has YAML frontmatter with name", async () => {
        const path = join(rootDir, "skills", skill, "SKILL.md");
        const content = await Bun.file(path).text();
        expect(content.startsWith("---")).toBe(true);
        expect(content).toContain(`name: ${skill}`);
      });

      test("SKILL.md has allowed-tools in frontmatter", async () => {
        const path = join(rootDir, "skills", skill, "SKILL.md");
        const content = await Bun.file(path).text();
        expect(content).toContain("allowed-tools:");
      });

      test("has at least 2 triggers", () => {
        expect(manifest.skills[skill].triggers.length).toBeGreaterThanOrEqual(2);
      });

      test("is in creative category", () => {
        expect(manifest.skills[skill].category).toBe("creative");
      });

      test("has a valid layer", () => {
        expect(["execution", "orchestrator"]).toContain(manifest.skills[skill].layer);
      });
    });
  }
});

// === SLIDESHOW-SCRIPT SPECIFICS ===

describe("slideshow-script skill", () => {
  test("reads voice-profile, positioning, audience", () => {
    const reads = manifest.skills["slideshow-script"].reads;
    expect(reads).toContain("voice-profile.md");
    expect(reads).toContain("positioning.md");
    expect(reads).toContain("audience.md");
  });

  test("depends on brand-voice and positioning-angles", () => {
    const deps = manifest.skills["slideshow-script"].depends_on;
    expect(deps).toContain("brand-voice");
    expect(deps).toContain("positioning-angles");
  });

  test("references/frameworks.md exists", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "frameworks.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("references/content-spec-schema.md exists", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "content-spec-schema.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("frameworks.md documents all 5 frameworks", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "frameworks.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("## AIDA");
    expect(content).toContain("## PAS");
    expect(content).toContain("## BAB");
    expect(content).toContain("## Star-Story-Solution");
    expect(content).toContain("## Stat-Flip");
  });

  test("frameworks.md documents all slide types", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "frameworks.md");
    const content = await Bun.file(path).text();
    const types = ["stat", "anchor_word", "emotional_pivot", "cascade", "cta", "logo_intro", "comparison", "question"];
    for (const type of types) {
      expect(content).toContain(`\`${type}\``);
    }
  });

  test("content-spec schema documents required fields", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "content-spec-schema.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("spec_version");
    expect(content).toContain("project");
    expect(content).toContain("content_type");
    expect(content).toContain("scripting_framework");
    expect(content).toContain("platform");
    expect(content).toContain("slides");
    expect(content).toContain("animation_hint");
    expect(content).toContain("voice_constraints");
  });

  test("content-spec schema documents validation rules", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "references", "content-spec-schema.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Validation Rules");
    expect(content).toContain("At least 3 slides");
    expect(content).toContain("Last slide must have `type: cta`");
  });

  test("SKILL.md references brand/voice-profile.md for scripts", async () => {
    const path = join(rootDir, "skills", "slideshow-script", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("voice-profile.md");
    expect(content).toContain("Voice rules");
  });
});

// === VIDEO-CONTENT SPECIFICS ===

describe("video-content skill", () => {
  test("reads creative-kit.md", () => {
    expect(manifest.skills["video-content"].reads).toContain("creative-kit.md");
  });

  test("writes assets.md", () => {
    expect(manifest.skills["video-content"].writes).toContain("assets.md");
  });

  test("has no hard dependencies (works standalone)", () => {
    expect(manifest.skills["video-content"].depends_on).toHaveLength(0);
  });

  test("references/remotion-archetypes.md exists", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "remotion-archetypes.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("references/ffmpeg-recipes.md exists", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "ffmpeg-recipes.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("references/data-contracts.md exists", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "data-contracts.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("rules/three-tiers.md exists", async () => {
    const path = join(rootDir, "skills", "video-content", "rules", "three-tiers.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("documents all 3 tiers", async () => {
    const path = join(rootDir, "skills", "video-content", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("v1 Quick");
    expect(content).toContain("v1.5 Enhanced");
    expect(content).toContain("v2 Full");
  });

  test("documents ffmpeg bookend architecture", async () => {
    const path = join(rootDir, "skills", "video-content", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("START");
    expect(content).toContain("MIDDLE");
    expect(content).toContain("END");
    expect(content).toContain("ffmpeg slice");
    expect(content).toContain("ffmpeg post");
  });

  test("remotion-archetypes documents all 6 archetypes", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "remotion-archetypes.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("LogoIntroSlide");
    expect(content).toContain("StatSlide");
    expect(content).toContain("AnchorWordSlide");
    expect(content).toContain("EmotionalPivotSlide");
    expect(content).toContain("CascadeSlide");
    expect(content).toContain("CTASlide");
  });

  test("remotion-archetypes documents all 4 spring presets", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "remotion-archetypes.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("bouncy");
    expect(content).toContain("smooth");
    expect(content).toContain("heavy");
    expect(content).toContain("snappy");
    expect(content).toContain("damping");
    expect(content).toContain("stiffness");
  });

  test("ffmpeg-recipes documents slice, stitch, Ken Burns, and post-processing", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "ffmpeg-recipes.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Slice Tall Artboard");
    expect(content).toContain("Crossfade Stitch");
    expect(content).toContain("Ken Burns");
    expect(content).toContain("Audio Mixing");
    expect(content).toContain("Post-Processing");
    expect(content).toContain("Platform-Specific Presets");
  });

  test("SKILL.md documents handoff YAML field names", async () => {
    const path = join(rootDir, "skills", "video-content", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("export_search_pattern");
    expect(content).toContain("artboard.width");
    expect(content).toContain("brand_snapshot");
    expect(content).toContain("content_spec");
    expect(content).toContain("extracted_jsx");
  });
});

// === TIKTOK-SLIDESHOW ORCHESTRATOR SPECIFICS ===

describe("tiktok-slideshow orchestrator", () => {
  test("depends on brand-voice and positioning-angles", () => {
    const deps = manifest.skills["tiktok-slideshow"].depends_on;
    expect(deps).toContain("brand-voice");
    expect(deps).toContain("positioning-angles");
  });

  test("reads all brand files needed by child skills", () => {
    const reads = manifest.skills["tiktok-slideshow"].reads;
    // Needs everything slideshow-script + paper-marketing + video-content need
    expect(reads).toContain("voice-profile.md");
    expect(reads).toContain("positioning.md");
    expect(reads).toContain("creative-kit.md");
  });

  test("SKILL.md references all 3 child skills", async () => {
    const path = join(rootDir, "skills", "tiktok-slideshow", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("/slideshow-script");
    expect(content).toContain("/paper-marketing");
    expect(content).toContain("/video-content");
  });

  test("SKILL.md has 3 phases", async () => {
    const path = join(rootDir, "skills", "tiktok-slideshow", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Phase 1: SCRIPT");
    expect(content).toContain("Phase 2: DESIGN");
    expect(content).toContain("Phase 3: VIDEO");
  });

  test("documents human-in-the-loop gates", async () => {
    const path = join(rootDir, "skills", "tiktok-slideshow", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Gate");
    expect(content).toContain("approve scripts");
    expect(content).toContain("exports PNG");
  });

  test("documents future orchestrator recipes", async () => {
    const path = join(rootDir, "skills", "tiktok-slideshow", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("/instagram-carousel");
    expect(content).toContain("/youtube-short");
    expect(content).toContain("/reels-batch");
  });

  test("documents the composable block principle", async () => {
    const path = join(rootDir, "skills", "tiktok-slideshow", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Skills never call skills");
    expect(content).toContain("Lego block");
  });
});

// === PAPER-MARKETING UPDATES ===

describe("paper-marketing updates", () => {
  test("references/platform-conventions.md exists", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "references", "platform-conventions.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("references/agent-quality-rubric.md exists", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "references", "agent-quality-rubric.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("SKILL.md documents intelligent goal discovery", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Intelligent Goal Discovery");
    expect(content).toContain("How many variations");
    expect(content).toContain("priority");
  });

  test("SKILL.md documents content spec check", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Check for Content Specs");
    expect(content).toContain("marketing/content-specs");
  });

  test("SKILL.md documents Export and Handoff phase", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Export and Handoff");
    expect(content).toContain("get_jsx");
    expect(content).toContain("handoff YAML");
  });

  test("SKILL.md documents handoff YAML schema with full brand snapshot", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("bg_primary");
    expect(content).toContain("bg_deep");
    expect(content).toContain("accent_muted");
    expect(content).toContain("text_muted");
    expect(content).toContain("font_display");
    expect(content).toContain("font_display_weights");
  });

  test("SKILL.md documents duplicate_nodes workflow", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("duplicate_nodes");
    expect(content).toContain("set_text_content");
    expect(content).toContain("update_styles");
  });

  test("SKILL.md documents /frontend-design integration", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("/frontend-design");
    expect(content).toContain("Swiss editorial typography");
  });

  test("SKILL.md documents quality rubric in agent prompt", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Quality Rubric");
    expect(content).toContain("text readability");
    expect(content).toContain("brand fidelity");
  });

  test("platform-conventions documents TikTok, Instagram, YouTube", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "references", "platform-conventions.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("## TikTok");
    expect(content).toContain("## Instagram Carousel");
    expect(content).toContain("## Instagram Story");
    expect(content).toContain("## YouTube Shorts");
  });

  test("agent-quality-rubric has 6 checkpoints", async () => {
    const path = join(rootDir, "skills", "paper-marketing", "references", "agent-quality-rubric.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("### 1. Text Readability");
    expect(content).toContain("### 2. Brand Fidelity");
    expect(content).toContain("### 3. Archetype Match");
    expect(content).toContain("### 4. Safe Zones");
    expect(content).toContain("### 5. Visual Rhythm");
    expect(content).toContain("### 6. Hierarchy");
  });
});

// === CMO ROUTING UPDATES ===

describe("cmo routing for orchestrator skills", () => {
  const cmoPath = join(rootDir, "skills", "cmo", "SKILL.md");

  test("routing table includes slideshow-script", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("slideshow-script");
    expect(content).toContain("Generate slideshow scripts");
  });

  test("routing table includes video-content", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("video-content");
    expect(content).toContain("Assemble video from slides");
  });

  test("routing table includes tiktok-slideshow", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("tiktok-slideshow");
    expect(content).toContain("TikTok slideshow end-to-end");
  });

  test("disambiguation handles TikTok video vs video-content", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain('"TikTok video"');
    expect(content).toContain('"video from slides"');
  });

  test("disambiguation handles script design vs scripting", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain('"design my script"');
    expect(content).toContain('"I have slides, make video"');
  });

  test("skill count updated to 42", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("42 marketing skills");
  });
});

// === REDIRECT COVERAGE ===

describe("orchestrator redirects", () => {
  test("tiktok redirects to tiktok-slideshow", () => {
    expect(manifest.redirects["tiktok"]).toBe("tiktok-slideshow");
  });

  test("tiktok-video redirects to tiktok-slideshow", () => {
    expect(manifest.redirects["tiktok-video"]).toBe("tiktok-slideshow");
  });

  test("slideshow redirects to tiktok-slideshow", () => {
    expect(manifest.redirects["slideshow"]).toBe("tiktok-slideshow");
  });

  test("video-assembly redirects to video-content", () => {
    expect(manifest.redirects["video-assembly"]).toBe("video-content");
  });

  test("video-render redirects to video-content", () => {
    expect(manifest.redirects["video-render"]).toBe("video-content");
  });

  test("content-creator redirects to tiktok-slideshow", () => {
    expect(manifest.redirects["content-creator"]).toBe("tiktok-slideshow");
  });
});

// === DATA CONTRACT CONSISTENCY ===

describe("data contract consistency", () => {
  test("content-spec schema animation hints match remotion archetypes", async () => {
    const schemaPath = join(rootDir, "skills", "slideshow-script", "references", "content-spec-schema.md");
    const archetypesPath = join(rootDir, "skills", "video-content", "references", "remotion-archetypes.md");

    const schema = await Bun.file(schemaPath).text();
    const archetypes = await Bun.file(archetypesPath).text();

    // All animation hints in schema should be referenced in archetypes
    const hints = ["spring_bouncy", "spring_smooth", "spring_heavy", "spring_snappy"];
    for (const hint of hints) {
      expect(schema).toContain(hint);
    }
    // Archetypes should reference the same spring names
    expect(archetypes).toContain("bouncy");
    expect(archetypes).toContain("smooth");
    expect(archetypes).toContain("heavy");
    expect(archetypes).toContain("snappy");
  });

  test("slide types match between content-spec schema and remotion archetypes", async () => {
    const schemaPath = join(rootDir, "skills", "slideshow-script", "references", "content-spec-schema.md");
    const archetypesPath = join(rootDir, "skills", "video-content", "references", "remotion-archetypes.md");

    const schema = await Bun.file(schemaPath).text();
    const archetypes = await Bun.file(archetypesPath).text();

    // Core types should appear in both
    const coreTypes = ["stat", "anchor_word", "emotional_pivot", "cascade", "cta", "logo_intro"];
    for (const type of coreTypes) {
      expect(schema).toContain(type);
      expect(archetypes).toContain(type);
    }
  });

  test("handoff YAML fields match between paper-marketing writer and video-content reader", async () => {
    const pmPath = join(rootDir, "skills", "paper-marketing", "SKILL.md");
    const vcPath = join(rootDir, "skills", "video-content", "SKILL.md");

    const pm = await Bun.file(pmPath).text();
    const vc = await Bun.file(vcPath).text();

    // Key fields paper-marketing writes should be documented in video-content's reads
    expect(pm).toContain("export_search_pattern");
    expect(vc).toContain("export_search_pattern");

    expect(pm).toContain("brand_snapshot");
    expect(vc).toContain("brand_snapshot");

    expect(pm).toContain("content_spec");
    expect(vc).toContain("content_spec");

    expect(pm).toContain("extracted_jsx");
    expect(vc).toContain("extracted_jsx");
  });

  test("data-contracts.md documents both YAML schemas", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "data-contracts.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("## Handoff YAML");
    expect(content).toContain("## Content Spec YAML");
    expect(content).toContain("## Animation Hint Values");
    expect(content).toContain("## Error Handling");
  });

  test("data-contracts error handling covers common failures", async () => {
    const path = join(rootDir, "skills", "video-content", "references", "data-contracts.md");
    const content = await Bun.file(path).text();
    expect(content).toContain("Content spec YAML missing");
    expect(content).toContain("Handoff YAML missing");
    expect(content).toContain("Image height not divisible");
    expect(content).toContain("invalid animation_hint");
  });
});

// === DAG INTEGRITY FOR ORCHESTRATOR CHAIN ===

describe("orchestrator dependency chain integrity", () => {
  test("slideshow-script can run after foundation skills", () => {
    const deps = manifest.skills["slideshow-script"].depends_on;
    // brand-voice and positioning-angles must exist
    for (const dep of deps) {
      expect(manifest.skills).toHaveProperty(dep);
    }
  });

  test("video-content can run standalone (no deps)", () => {
    expect(manifest.skills["video-content"].depends_on).toHaveLength(0);
  });

  test("tiktok-slideshow dependencies are subset of its children's deps", () => {
    const orchDeps = new Set(manifest.skills["tiktok-slideshow"].depends_on);
    const scriptDeps = manifest.skills["slideshow-script"].depends_on;

    // Orchestrator deps should include at least the scripting deps
    for (const dep of scriptDeps) {
      expect(orchDeps.has(dep)).toBe(true);
    }
  });

  test("tiktok-slideshow reads are superset of child skill reads", () => {
    const orchReads = new Set(manifest.skills["tiktok-slideshow"].reads);
    const scriptReads = manifest.skills["slideshow-script"].reads;

    // Orchestrator should read everything the first skill needs
    for (const read of scriptReads) {
      expect(orchReads.has(read)).toBe(true);
    }
  });

  test("no circular deps in orchestrator chain", () => {
    // slideshow-script should NOT depend on video-content or tiktok-slideshow
    expect(manifest.skills["slideshow-script"].depends_on).not.toContain("video-content");
    expect(manifest.skills["slideshow-script"].depends_on).not.toContain("tiktok-slideshow");

    // video-content should NOT depend on slideshow-script or tiktok-slideshow
    expect(manifest.skills["video-content"].depends_on).not.toContain("slideshow-script");
    expect(manifest.skills["video-content"].depends_on).not.toContain("tiktok-slideshow");

    // tiktok-slideshow should NOT depend on its own child skills
    expect(manifest.skills["tiktok-slideshow"].depends_on).not.toContain("slideshow-script");
    expect(manifest.skills["tiktok-slideshow"].depends_on).not.toContain("video-content");
    expect(manifest.skills["tiktok-slideshow"].depends_on).not.toContain("paper-marketing");
  });
});

// === CLAUDE.MD CONSISTENCY ===

describe("CLAUDE.md consistency", () => {
  test("documents current skill count", async () => {
    const content = await Bun.file(join(rootDir, "CLAUDE.md")).text();
    // CLAUDE.md should mention a skill count — currently 40+ skills
    expect(content).toMatch(/\d+ marketing skills/);
  });

  test("documents orchestrator pattern in principles", async () => {
    const content = await Bun.file(join(rootDir, "CLAUDE.md")).text();
    expect(content).toContain("Composable orchestrators");
    expect(content).toContain("Lego blocks");
  });

  test("lists slideshow-script and video-content in Creative category", async () => {
    const content = await Bun.file(join(rootDir, "CLAUDE.md")).text();
    expect(content).toContain("slideshow-script");
    expect(content).toContain("video-content");
  });

  test("lists tiktok-slideshow in Orchestrators category", async () => {
    const content = await Bun.file(join(rootDir, "CLAUDE.md")).text();
    expect(content).toContain("**Orchestrators:**");
    expect(content).toContain("tiktok-slideshow");
  });
});

// === PLAN FILE EXISTS ===

describe("plan documentation", () => {
  // Plan files are transient dev artifacts — skills are the source of truth
  test("orchestrator skills exist in manifest as source of truth", () => {
    expect(manifest.skills["slideshow-script"]).toBeDefined();
    expect(manifest.skills["video-content"]).toBeDefined();
    expect(manifest.skills["tiktok-slideshow"]).toBeDefined();
  });
});

// === APP-STORE-SCREENSHOTS AND FRONTEND-SLIDES ===

describe("app-store-screenshots skill", () => {
  test("exists in manifest", () => {
    expect(manifest.skills).toHaveProperty("app-store-screenshots");
  });

  test("is creative category, execution layer", () => {
    expect(manifest.skills["app-store-screenshots"].category).toBe("creative");
    expect(manifest.skills["app-store-screenshots"].layer).toBe("execution");
  });

  test("SKILL.md exists", async () => {
    const path = join(rootDir, "skills", "app-store-screenshots", "SKILL.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("reads voice-profile and positioning", () => {
    const reads = manifest.skills["app-store-screenshots"].reads;
    expect(reads).toContain("voice-profile.md");
    expect(reads).toContain("positioning.md");
  });

  test("redirects exist", () => {
    expect(manifest.redirects["app-screenshots"]).toBe("app-store-screenshots");
    expect(manifest.redirects["ios-screenshots"]).toBe("app-store-screenshots");
    expect(manifest.redirects["aso-screenshots"]).toBe("app-store-screenshots");
    expect(manifest.redirects["store-screenshots"]).toBe("app-store-screenshots");
  });
});

describe("frontend-slides skill", () => {
  test("exists in manifest", () => {
    expect(manifest.skills).toHaveProperty("frontend-slides");
  });

  test("is creative category, execution layer", () => {
    expect(manifest.skills["frontend-slides"].category).toBe("creative");
    expect(manifest.skills["frontend-slides"].layer).toBe("execution");
  });

  test("SKILL.md exists", async () => {
    const path = join(rootDir, "skills", "frontend-slides", "SKILL.md");
    expect(await Bun.file(path).exists()).toBe(true);
  });

  test("has supporting files", async () => {
    const base = join(rootDir, "skills", "frontend-slides");
    expect(await Bun.file(join(base, "STYLE_PRESETS.md")).exists()).toBe(true);
    expect(await Bun.file(join(base, "viewport-base.css")).exists()).toBe(true);
    expect(await Bun.file(join(base, "animation-patterns.md")).exists()).toBe(true);
    expect(await Bun.file(join(base, "html-template.md")).exists()).toBe(true);
  });

  test("redirects exist", () => {
    expect(manifest.redirects["presentation"]).toBe("frontend-slides");
    expect(manifest.redirects["pitch-deck"]).toBe("frontend-slides");
    expect(manifest.redirects["html-slides"]).toBe("frontend-slides");
    expect(manifest.redirects["ppt-conversion"]).toBe("frontend-slides");
    expect(manifest.redirects["conference-slides"]).toBe("frontend-slides");
  });
});

// === CMO PHILOSOPHY ===

describe("cmo north star philosophy", () => {
  const cmoPath = join(rootDir, "skills", "cmo", "SKILL.md");

  test("has North Star section", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("## North Star");
  });

  test("describes builder persona", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("curious builder");
    expect(content).toContain("marketing is not their strength");
  });

  test("CMO suggests rather than asks", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("You suggest");
    expect(content).toContain("tell them what you'd do");
  });

  test("CMO asks smart questions", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("You ask smart questions");
  });

  test("CMO discusses high-stakes decisions", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("You discuss when it matters");
  });

  test("CMO teaches as it goes", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("You teach as you go");
  });

  test("has How You Talk to the Builder section", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("## How You Talk to the Builder");
  });

  test("handles vague, specific, wrong, and context-needed scenarios", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("When they're vague");
    expect(content).toContain("When they're specific");
    expect(content).toContain("When they're wrong");
    expect(content).toContain("When you need more context");
  });

  test("has Conversational Guardrails", async () => {
    const content = await Bun.file(cmoPath).text();
    expect(content).toContain("## Conversational Guardrails");
    expect(content).toContain("Never present a menu without a recommendation");
    expect(content).toContain("Never assume the builder knows marketing terms");
    expect(content).toContain("Push back when something won't work");
  });
});
