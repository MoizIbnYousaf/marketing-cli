import "@/test/setup-dom";

import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { SkillsCatalog } from "./SkillsCatalog";

const countVisibleCards = () =>
  document.querySelectorAll("[data-skill-card]").length;

const EXPECTED_COUNTS = {
  All: 39,
  Foundation: 9,
  Strategy: 3,
  "Copy & Content": 3,
  Distribution: 7,
  Creative: 8,
  SEO: 3,
  Conversion: 2,
  Growth: 3,
  Knowledge: 1,
} as const;

describe("SkillsCatalog", () => {
  test("renders all category tabs and shows all 39 skills by default", () => {
    const view = render(<SkillsCatalog />);
    const tabs = view.getAllByRole("tab");

    expect(view.container.querySelector("section#skills")).toBeDefined();
    expect(view.getByRole("heading", { name: /browse the full playbook/i })).toBeDefined();
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "All",
      "Foundation",
      "Strategy",
      "Copy & Content",
      "Distribution",
      "Creative",
      "SEO",
      "Conversion",
      "Growth",
      "Knowledge",
    ]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(countVisibleCards()).toBe(39);
    expect(view.getAllByText("cmo")[0]).toBeDefined();
    expect(view.getAllByText("marketing-psychology")[0]).toBeDefined();
  });

  test("filters skills per category with a distinct active tab state", () => {
    const view = render(<SkillsCatalog />);

    for (const [label, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
      const tab = view.getByRole("tab", { name: label });
      fireEvent.click(tab);

      expect(tab.getAttribute("aria-selected")).toBe("true");
      expect(countVisibleCards()).toBe(expectedCount);
    }

    fireEvent.click(view.getByRole("tab", { name: "Strategy" }));
    expect(view.getByText("keyword-research")).toBeDefined();
    expect(view.queryByText("cmo")).toBeNull();

    fireEvent.click(view.getByRole("tab", { name: "Knowledge" }));
    expect(view.getByText("marketing-psychology")).toBeDefined();
    expect(view.queryByText("keyword-research")).toBeNull();
  });

  test("shows tier badges with distinct styles and toggles expanded details", () => {
    const view = render(<SkillsCatalog />);

    const mustHaveBadge = view.getAllByText("must-have")[0];
    const niceToHaveBadge = view.getAllByText("nice-to-have")[0];

    expect(mustHaveBadge.className).toContain("emerald");
    expect(niceToHaveBadge.className).toContain("slate");

    const expandButton = view.getByRole("button", { name: /show details for cmo/i });
    fireEvent.click(expandButton);

    expect(view.getByText(/^Trigger keywords$/i)).toBeDefined();
    expect(view.getAllByText(/marketing, cmo, what should i do/i)[0]).toBeDefined();
    expect(view.getByText(/^Dependencies$/i)).toBeDefined();

    fireEvent.click(view.getByRole("button", { name: /hide details for cmo/i }));
    expect(view.queryByText(/^Trigger keywords$/i)).toBeNull();
    expect(view.container.querySelector("[data-skills-tabs]")?.className).toContain("overflow-x-auto");
    expect(view.container.querySelector("[data-skills-grid]")?.className).toContain("grid-cols-1");
  });
});
