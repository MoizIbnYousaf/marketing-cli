import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "./page";

const getHeadingLevels = (markup: string) =>
  [...markup.matchAll(/<h([1-6])\b[^>]*>/g)].map((match) => Number(match[1]));

describe("HomePage", () => {
  test("renders the nav, hero, footer, and page sections with a single h1", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    const headingLevels = getHeadingLevels(markup);
    const featuresIndex = markup.indexOf('section id="features"');
    const skillsIndex = markup.indexOf('section id="skills"');
    const testimonialsIndex = markup.indexOf('section id="testimonials"');
    const installIndex = markup.indexOf('section id="install"');
    const footerIndex = markup.indexOf("<footer");

    expect(markup).toContain("mktg");
    expect(markup).toContain("full CMO brain");
    expect(markup).toContain("Watch mktg go from one install");
    expect(markup).toContain("mktg init");
    expect(markup).toContain("mktg status");
    expect(markup).toContain("mktg doctor");
    expect(markup).toContain("Get Started");
    expect(markup).toContain("View on GitHub");
    expect(markup).toContain("Features");
    expect(markup).toContain("Skills");
    expect(markup).toContain("Browse the full playbook");
    expect(markup).toContain("Testimonials");
    expect(markup).toContain("What people are saying");
    expect(markup).toContain("How it works");
    expect(markup).toContain("Let your agent market");
    expect(markup).toContain("Install mktg now");
    expect(markup).toContain("Built for agents, by agents");
    expect(markup).toContain("section id=\"features\"");
    expect(markup).toContain("section id=\"skills\"");
    expect(markup).toContain("section id=\"testimonials\"");
    expect(markup).toContain("section id=\"install\"");
    expect(skillsIndex).toBeGreaterThan(featuresIndex);
    expect(testimonialsIndex).toBeGreaterThan(skillsIndex);
    expect(installIndex).toBeGreaterThan(testimonialsIndex);
    expect(footerIndex).toBeGreaterThan(installIndex);
    expect(markup.trim().endsWith("</footer>")).toBe(true);
    expect(headingLevels.filter((level) => level === 1)).toHaveLength(1);

    headingLevels.reduce((previousLevel, currentLevel) => {
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      return currentLevel;
    });
  });
});
