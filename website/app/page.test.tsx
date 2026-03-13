import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "./page";

describe("HomePage", () => {
  test("renders the nav, hero, and page sections with a single h1", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    const h1Matches = markup.match(/<h1/g) ?? [];

    expect(markup).toContain("mktg");
    expect(markup).toContain("full CMO brain");
    expect(markup).toContain("Get Started");
    expect(markup).toContain("View on GitHub");
    expect(markup).toContain("Features");
    expect(markup).toContain("Skills");
    expect(markup).toContain("Testimonials");
    expect(markup).toContain("Install");
    expect(markup).toContain("section id=\"features\"");
    expect(markup).toContain("section id=\"install\"");
    expect(h1Matches).toHaveLength(1);
  });
});
