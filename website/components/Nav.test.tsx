import "@/test/setup-dom";

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { act } from "react";

import { GITHUB_REPO_URL, NAV_LINKS, Nav } from "./Nav";

type MockEntry = {
  id: string;
  intersectionRatio: number;
  isIntersecting?: boolean;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observed = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  trigger(entries: MockEntry[]) {
    this.callback(
      entries.map((entry) => {
        const target = [...this.observed].find((element) => element.id === entry.id);

        if (!target) {
          throw new Error(`Missing observed target for ${entry.id}`);
        }

        return {
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: entry.intersectionRatio,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting: entry.isIntersecting ?? true,
          rootBounds: null,
          target,
          time: Date.now(),
        } satisfies IntersectionObserverEntry;
      }),
      this as unknown as IntersectionObserver,
    );
  }
}

const scrollToMock = mock(() => {});

const setScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
    writable: true,
  });
};

const setInnerWidth = (value: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value,
    writable: true,
  });
};

const renderNav = () =>
  {
    const view = render(
      <>
        <Nav />
        <main>
          {NAV_LINKS.map((link) => (
            <section key={link.sectionId} id={link.sectionId}>
              {link.label}
            </section>
          ))}
        </main>
      </>,
    );

    return {
      ...view,
      scope: within(view.container),
    };
  };

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  scrollToMock.mockClear();
  setScrollY(0);
  setInnerWidth(375);
  document.body.style.overflow = "";

  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: scrollToMock,
    writable: true,
  });

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: MockIntersectionObserver,
    writable: true,
  });
});

describe("Nav", () => {
  test("renders the logo, section links, GitHub link, CTA, and responsive nav controls", () => {
    const view = renderNav();

    expect(view.scope.getByRole("navigation", { name: "Primary" })).toBeDefined();
    expect(view.scope.getByRole("button", { name: "Scroll to top" })).toBeDefined();

    for (const link of NAV_LINKS) {
      const anchor = view.scope.getByRole("link", { name: link.label });

      expect(anchor.getAttribute("href")).toBe(link.href);
    }

    const githubLink = view.scope.getByRole("link", { name: "GitHub" });

    expect(githubLink.getAttribute("href")).toBe(GITHUB_REPO_URL);
    expect(githubLink.getAttribute("target")).toBe("_blank");
    expect(githubLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(view.scope.getByRole("button", { name: "Get Started" })).toBeDefined();
    expect(view.scope.getByTestId("desktop-nav-links").className).toContain(
      "min-[769px]:flex",
    );
    expect(view.scope.getByTestId("nav-toggle").className).toContain("min-[769px]:hidden");
  });

  test("starts transparent, becomes solid on scroll, and scrolls to top on logo click", () => {
    const view = renderNav();

    const nav = view.scope.getByTestId("site-nav");

    expect(nav.className).toContain("bg-transparent");

    act(() => {
      setScrollY(128);
      window.dispatchEvent(new window.Event("scroll"));
    });

    expect(nav.className).toContain("bg-slate-950/80");
    expect(nav.className).toContain("backdrop-blur-xl");

    fireEvent.click(view.scope.getByRole("button", { name: "Scroll to top" }));

    const scrollCalls = scrollToMock.mock.calls as unknown as Array<
      [ScrollToOptions]
    >;

    expect(scrollCalls.length).toBe(1);
    expect(scrollCalls[0][0]).toEqual({ top: 0, behavior: "smooth" });
  });

  test("scrolls the CTA to install and toggles the mobile menu with body scroll lock", () => {
    const view = renderNav();

    fireEvent.click(view.scope.getByRole("button", { name: "Get Started" }));

    const scrollCalls = scrollToMock.mock.calls as unknown as Array<[ScrollToOptions]>;

    expect(scrollCalls.length).toBe(1);
    expect(scrollCalls[0][0]).toEqual({
      top: 0,
      behavior: "smooth",
    });

    const toggle = view.scope.getByRole("button", { name: /open navigation menu/i });

    fireEvent.click(toggle);

    const mobileMenu = view.scope.getByRole("dialog", { name: "Mobile navigation menu" });

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(within(mobileMenu).getByRole("link", { name: "Features" }));

    expect(view.scope.queryByRole("dialog", { name: "Mobile navigation menu" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("uses explicit smooth scrolling offsets for anchor links", () => {
    const view = renderNav();
    const installSection = document.getElementById("install");

    if (!installSection) {
      throw new Error("Install section not found");
    }

    Object.defineProperty(installSection, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 860,
        width: 100,
        height: 400,
        top: 860,
        left: 0,
        bottom: 1260,
        right: 100,
        toJSON: () => ({}),
      }),
    });

    act(() => {
      setScrollY(240);
    });

    fireEvent.click(view.scope.getByRole("link", { name: "Install" }));

    const scrollCalls = scrollToMock.mock.calls as unknown as Array<[ScrollToOptions]>;

    expect(scrollCalls.at(-1)?.[0]).toEqual({ top: 1004, behavior: "smooth" });
  });

  test("highlights the active section via IntersectionObserver and clears it at the top", () => {
    const view = renderNav();

    const observer = MockIntersectionObserver.instances[0];
    const observedIds = [...observer.observed].map((element) => element.id).sort();

    expect(observedIds).toEqual(["features", "install", "skills", "testimonials"]);

    const featuresLink = view.scope.getByRole("link", { name: "Features" });
    const skillsLink = view.scope.getByRole("link", { name: "Skills" });

    expect(featuresLink.getAttribute("aria-current")).toBeNull();
    expect(skillsLink.getAttribute("aria-current")).toBeNull();

    act(() => {
      setScrollY(320);
      window.dispatchEvent(new window.Event("scroll"));
      observer.trigger([{ id: "features", intersectionRatio: 0.72 }]);
    });

    expect(featuresLink.getAttribute("aria-current")).toBe("page");
    expect(skillsLink.getAttribute("aria-current")).toBeNull();

    act(() => {
      observer.trigger([
        { id: "features", intersectionRatio: 0.28 },
        { id: "skills", intersectionRatio: 0.82 },
      ]);
    });

    expect(featuresLink.getAttribute("aria-current")).toBeNull();
    expect(skillsLink.getAttribute("aria-current")).toBe("page");

    act(() => {
      setScrollY(0);
      window.dispatchEvent(new window.Event("scroll"));
    });

    expect(featuresLink.getAttribute("aria-current")).toBeNull();
    expect(skillsLink.getAttribute("aria-current")).toBeNull();
  });
});
