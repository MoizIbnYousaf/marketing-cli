import "@/test/setup-dom";

import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";

import { InstallCTA } from "./InstallCTA";

describe("InstallCTA", () => {
  test("renders the install command, ordered steps, and prominent CTA styling", () => {
    const host = document.createElement("div");
    const view = render(<InstallCTA />, { container: host });
    const scoped = within(view.container);
    const section = view.container.querySelector("section#install");
    const command = scoped.getByText("npx mktg init");
    const steps = Array.from(view.container.querySelectorAll("[data-install-step]"));
    const stepNumbers = steps.map((step) => step.querySelector("span")?.textContent?.trim());
    const stepTitles = steps.map((step) => step.querySelector("h3")?.textContent?.trim());
    const finalCta = scoped.getByRole("link", { name: /install mktg now/i });

    expect(section).toBeDefined();
    expect(section?.className).toContain("bg-");
    expect(command.className).toContain("font-mono");
    expect(view.container.querySelector("[data-install-command-panel]")?.className).toContain(
      "bg-slate-950",
    );
    expect(steps).toHaveLength(3);
    expect(stepNumbers).toEqual(["1", "2", "3"]);
    expect(stepTitles).toEqual(["Install", "Init", "Let your agent market"]);
    expect(finalCta.className).toContain("focus-visible:ring");
    expect(finalCta.className).toContain("hover:bg-emerald-300");
  });

  test("copies the exact install command and shows visual feedback", async () => {
    const writeText = mock(async (value: string) => value);

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const host = document.createElement("div");
    const view = render(<InstallCTA />, { container: host });
    const scoped = within(view.container);

    fireEvent.click(scoped.getByRole("button", { name: /copy install command/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("npx mktg init");
      expect(scoped.getByText("Copied!")).toBeDefined();
    });
  });

  test("uses the execCommand fallback and only shows success when it returns true", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mock(async () => {
          throw new Error("clipboard blocked");
        }),
      },
    });

    const execCommand = mock(() => true);

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const host = document.createElement("div");
    const view = render(<InstallCTA />, { container: host });
    const scoped = within(view.container);

    fireEvent.click(scoped.getByRole("button", { name: /copy install command/i }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(scoped.getByText("Copied!")).toBeDefined();
    });
  });

  test("shows copy failure when the fallback cannot confirm success", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mock(async () => {
          throw new Error("clipboard blocked");
        }),
      },
    });

    const execCommand = mock(() => false);

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const host = document.createElement("div");
    const view = render(<InstallCTA />, { container: host });
    const scoped = within(view.container);

    fireEvent.click(scoped.getByRole("button", { name: /copy install command/i }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(scoped.getByText("Copy failed")).toBeDefined();
      expect(scoped.queryByText("Copied!")).toBeNull();
    });
  });
});
