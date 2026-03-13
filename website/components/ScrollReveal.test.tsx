import "@/test/setup-dom";

import { beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { act } from "react";

import { ScrollReveal } from "./ScrollReveal";

type MockEntry = {
  intersectionRatio: number;
  isIntersecting?: boolean;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed = new Set<Element>();
  disconnectCalls = 0;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  disconnect() {
    this.disconnectCalls += 1;
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

let prefersReducedMotion = false;

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  prefersReducedMotion = false;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: prefersReducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
  });

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: MockIntersectionObserver,
    writable: true,
  });
});

describe("ScrollReveal", () => {
  test("starts hidden, then reveals once after intersecting the viewport threshold", () => {
    const view = render(
      <ScrollReveal className="mx-auto max-w-6xl">
        <section>Animated content</section>
      </ScrollReveal>,
    );

    const wrapper = view.container.firstElementChild as HTMLElement;
    const observer = MockIntersectionObserver.instances[0];

    expect(wrapper.dataset.revealState).toBe("hidden");
    expect(wrapper.className).toContain("transition-[opacity,transform]");
    expect(wrapper.className).toContain("translate-y-6");
    expect(observer.options?.threshold).toEqual([0.01]);

    act(() => {
      observer.trigger({ intersectionRatio: 0.45 });
    });

    expect(wrapper.dataset.revealState).toBe("visible");
    expect(wrapper.className).toContain("opacity-100");
    expect(wrapper.className).toContain("translate-y-0");
    expect(observer.disconnectCalls).toBeGreaterThan(0);
  });

  test("skips the hidden state when reduced motion is enabled", () => {
    prefersReducedMotion = true;

    const view = render(
      <ScrollReveal>
        <section>Animated content</section>
      </ScrollReveal>,
    );

    const wrapper = view.container.firstElementChild as HTMLElement;

    expect(wrapper.dataset.revealState).toBe("visible");
    expect(wrapper.className).not.toContain("transition-[opacity,transform]");
    expect(wrapper.className).toContain("opacity-100");
    expect(wrapper.className).toContain("translate-y-0");
  });
});
