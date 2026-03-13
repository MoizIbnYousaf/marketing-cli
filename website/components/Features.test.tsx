import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Features } from "./Features";

const EXPECTED_FEATURES = [
  [
    "Agent-Native",
    "Built for AI agents, not humans — predictable primitives, structured output, and zero hand-holding.",
  ],
  [
    "Self-Bootstrapping",
    "One command with mktg init scaffolds the brand memory, installs skills, and verifies the environment.",
  ],
  [
    "39 Marketing Skills",
    "A full CMO knowledge base spanning strategy, SEO, copy, creative, conversion, and growth workflows.",
  ],
  [
    "Brand Memory",
    "The brand/ directory compounds voice, positioning, and launch context across every future session.",
  ],
  [
    "Parallel Research",
    "Three dedicated agents research audience, positioning, and competitors at the same time.",
  ],
  [
    "Composable",
    "Skills are Lego blocks and orchestrators are recipes, so your agent can remix proven workflows fast.",
  ],
] as const;

describe("Features", () => {
  test("renders the features section with six cards, icons, and readable content", () => {
    const markup = renderToStaticMarkup(<Features />);
    const cards = markup.match(/data-feature-card/g) ?? [];
    const icons = [...markup.matchAll(/data-feature-icon="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(markup).toContain('id="features"');
    expect(markup).toContain("Why agents ship faster with mktg");
    expect(cards).toHaveLength(6);
    expect(icons).toHaveLength(6);
    expect(new Set(icons).size).toBe(6);

    for (const [title, description] of EXPECTED_FEATURES) {
      expect(markup).toContain(title);
      expect(markup).toContain(description);
    }
  });

  test("uses the expected responsive grid and hover glow styling", () => {
    const markup = renderToStaticMarkup(<Features />);

    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("sm:grid-cols-2");
    expect(markup).toContain("lg:grid-cols-3");
    expect(markup).toContain("bg-slate-900");
    expect(markup).toContain("border-slate-800");
    expect(markup).toContain("transition");
    expect(markup).toContain("hover:border-emerald-400/45");
    expect(markup).toContain("hover:shadow-");
  });
});
