import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Testimonials } from "./Testimonials";

describe("Testimonials", () => {
  test("renders a semantic testimonials section with placeholder avatar cards", () => {
    const markup = renderToStaticMarkup(<Testimonials />);
    const cards = markup.match(/data-testimonial-card/g) ?? [];
    const avatars = markup.match(/data-testimonial-avatar/g) ?? [];
    const blockquotes = markup.match(/<blockquote/g) ?? [];

    expect(markup).toContain('section id="testimonials"');
    expect(markup).toContain("Testimonials");
    expect(markup).toContain("What people are saying");
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(avatars.length).toBe(cards.length);
    expect(blockquotes.length).toBe(cards.length);
    expect(markup).toContain("Avery Chen");
    expect(markup).toContain("Maya Patel");
    expect(markup).toContain("Jordan Lee");
    expect(markup).toContain("“");
    expect(markup).not.toMatch(/\{[^}]+\}/);
  });

  test("uses responsive equal-height card styling consistent with the dark theme", () => {
    const markup = renderToStaticMarkup(<Testimonials />);

    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("lg:grid-cols-3");
    expect(markup).toContain("items-stretch");
    expect(markup).toContain("h-full");
    expect(markup).toContain("bg-slate-900");
    expect(markup).toContain("border-slate-800");
    expect(markup).toContain("text-slate-100");
    expect(markup).toContain("text-slate-300");
  });
});
