import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Footer } from "./Footer";

describe("Footer", () => {
  test("renders a semantic footer with the required links and copy", () => {
    const markup = renderToStaticMarkup(<Footer />);

    expect(markup).toContain("<footer");
    expect(markup).toContain("GitHub repo");
    expect(markup).toContain("npm package");
    expect(markup).toContain("© 2026 mktg");
    expect(markup).toContain("Built for agents, by agents");
    expect(markup).toContain("https://github.com/moizibnyousaf/mktg");
    expect(markup).toContain("https://www.npmjs.com/package/mktg");
    expect(markup.match(/target=\"_blank\"/g) ?? []).toHaveLength(2);
    expect(markup.match(/rel=\"noopener noreferrer\"/g) ?? []).toHaveLength(2);
  });

  test("uses minimal dark styling that keeps the desktop footer compact", () => {
    const markup = renderToStaticMarkup(<Footer />);

    expect(markup).toContain("border-t border-slate-800/80");
    expect(markup).toContain("bg-slate-950/95");
    expect(markup).toContain("py-6");
    expect(markup).toContain("sm:py-8");
    expect(markup).toContain("max-w-6xl");
  });
});
