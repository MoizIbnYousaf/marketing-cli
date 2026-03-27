import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Hero } from "./Hero";

describe("Hero", () => {
  test("renders value-prop copy with install and GitHub CTAs", () => {
    const markup = renderToStaticMarkup(<Hero />);

    expect(markup).toContain("<h1");
    expect(markup).toContain("full CMO brain");
    expect(markup).toContain("AI agents the marketing system");
    expect(markup).toContain("brand memory");
    expect(markup).toContain("42 skills across strategy, copy, SEO, creative, and conversion");
    expect(markup).toContain('href="#install"');
    expect(markup).toContain(
      "https://github.com/moizibnyousaf/mktg",
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  test("uses accessible touch targets and decorative glow treatments", () => {
    const markup = renderToStaticMarkup(<Hero />);

    const glowMatches = markup.match(/data-hero-glow/g) ?? [];

    expect(markup).toContain("min-h-11");
    expect(markup).toContain("hover:bg-emerald-300");
    expect(markup).toContain("hover:border-slate-700");
    expect(glowMatches).toHaveLength(3);
    expect(markup).toContain("lg:grid-cols");
  });
});
