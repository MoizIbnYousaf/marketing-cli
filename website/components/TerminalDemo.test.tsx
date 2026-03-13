import "@/test/setup-dom";

import { beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { act } from "react";

import { TerminalDemo } from "./TerminalDemo";

type MockEntry = {
  intersectionRatio: number;
  isIntersecting?: boolean;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  disconnect() {
    this.observed.clear();
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  trigger(entry: MockEntry) {
    const target = [...this.observed][0];

    if (!target) {
      throw new Error("Missing observed target");
    }

    this.callback(
      [
        {
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: entry.intersectionRatio,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting: entry.isIntersecting ?? true,
          rootBounds: null,
          target,
          time: Date.now(),
        } satisfies IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

const FAST_ANIMATION = {
  minCharacterDelay: 10,
  maxCharacterDelay: 10,
  commandPause: 10,
  lineDelay: 10,
  lineJitter: 0,
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const tick = async (milliseconds: number) => {
  await act(async () => {
    await wait(milliseconds);
  });
};

let prefersReducedMotion = false;

const renderDemo = () =>
  render(<TerminalDemo animationConfig={FAST_ANIMATION} />);

beforeEach(() => {
  cleanup();
  document.body.innerHTML = "";

  MockIntersectionObserver.instances = [];
  prefersReducedMotion = false;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      media: query,
      matches: prefersReducedMotion,
      onchange: null,
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {},
    }),
  });

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: MockIntersectionObserver,
    writable: true,
  });
});

describe("TerminalDemo", () => {
  test("renders terminal chrome, tabs, ARIA wiring, and responsive terminal panel", () => {
    const view = renderDemo();
    const tabs = view.getAllByRole("tab");
    const panel = view.getByRole("tabpanel");
    const cursor = view.getByTestId("terminal-cursor");

    expect(view.getByRole("region", { name: /animated terminal demo/i })).toBeDefined();
    expect(view.container.querySelectorAll("[data-terminal-dot]")).toHaveLength(3);
    expect(view.getByRole("tablist", { name: "CLI demos" })).toBeDefined();
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "mktg init",
      "mktg status",
      "mktg doctor",
    ]);
    expect(tabs.every((tab) => tab.getAttribute("tabindex") === "0")).toBe(true);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(panel.className).toContain("overflow-y-auto");
    expect(panel.className).toContain("max-h-[24rem]");
    expect(panel.className).toContain("text-[12px]");
    expect(cursor.className).toContain("terminal-cursor-blink");

    const observer = MockIntersectionObserver.instances[0];

    expect(observer.options?.threshold).toEqual([0.5]);
  });

  test("waits for 50% visibility, then types the command and auto-scrolls output line by line", async () => {
    const view = renderDemo();
    const command = view.getByTestId("terminal-command");
    const panel = view.getByTestId("terminal-panel");
    const observer = MockIntersectionObserver.instances[0];

    Object.defineProperty(panel, "scrollHeight", {
      configurable: true,
      value: 640,
    });

    Object.defineProperty(panel, "clientHeight", {
      configurable: true,
      value: 240,
    });

    act(() => {
      observer.trigger({ intersectionRatio: 0.45 });
    });

    await tick(40);
    expect(command.textContent).toBe("");
    expect(view.queryByText(/Bootstrapping your marketing operating system/i)).toBeNull();

    act(() => {
      observer.trigger({ intersectionRatio: 0.75 });
    });

    await tick(25);
    expect(command.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(command.textContent).not.toBe("mktg init");

    await waitFor(() => {
      expect(view.getByText(/Bootstrapping your marketing operating system/i)).toBeDefined();
      expect(view.getByText(/GitHub CLI auth missing/i)).toBeDefined();
      expect(panel.scrollTop).toBe(640);
    });
  });

  test("switches tabs with keyboard, resets mid-animation, and prevents ghost output", async () => {
    const view = renderDemo();
    const observer = MockIntersectionObserver.instances[0];
    const tabs = view.getAllByRole("tab");
    const command = view.getByTestId("terminal-command");

    act(() => {
      observer.trigger({ intersectionRatio: 0.8 });
    });

    await tick(35);
    expect(command.textContent?.length ?? 0).toBeGreaterThan(0);

    act(() => {
      tabs[0].focus();
      fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    });

    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    expect(view.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tabs[1].id);
    expect(view.queryByText(/Bootstrapping your marketing operating system/i)).toBeNull();

    await waitFor(() => {
      expect(view.getByText(/Marketing state snapshot/i)).toBeDefined();
      expect(view.getByText(/No launch brief found/i)).toBeDefined();
    });

    expect(view.queryByText(/GitHub CLI auth missing/i)).toBeNull();
  });

  test("respects reduced motion by rendering instantly without cursor blink animation", async () => {
    prefersReducedMotion = true;

    const view = renderDemo();
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger({ intersectionRatio: 0.9 });
    });

    await waitFor(() => {
      expect(view.getByTestId("terminal-command").textContent).toBe("mktg init");
      expect(view.getByText(/Doctor baseline passed/i)).toBeDefined();
    });

    expect(view.getByTestId("terminal-cursor").className).not.toContain(
      "terminal-cursor-blink",
    );
  });
});
