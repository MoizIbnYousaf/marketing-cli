import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "./page";

describe("HomePage", () => {
  test("renders the nav and placeholder sections", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("mktg");
    expect(markup).toContain("Features");
    expect(markup).toContain("Skills");
    expect(markup).toContain("Testimonials");
    expect(markup).toContain("Install");
    expect(markup).toContain("section id=\"features\"");
    expect(markup).toContain("section id=\"install\"");
  });
});
