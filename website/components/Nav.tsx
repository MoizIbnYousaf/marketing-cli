"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { scrollToSectionById } from "@/lib/scroll";

const SCROLL_LOCK_STYLES = {
  overflow: "hidden",
};

export const GITHUB_REPO_URL = "https://github.com/moizibnyousaf/mktg";

export const NAV_LINKS = [
  { href: "#features", label: "Features", sectionId: "features" },
  { href: "#skills", label: "Skills", sectionId: "skills" },
  { href: "#testimonials", label: "Testimonials", sectionId: "testimonials" },
  { href: "#install", label: "Install", sectionId: "install" },
] as const;

const DESKTOP_BREAKPOINT = 769;
const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type SectionId = (typeof NAV_LINKS)[number]["sectionId"];

const getSectionFromHref = (href: string) => href.replace("#", "") as SectionId;

export function Nav() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const visibleRatiosRef = useRef<Map<SectionId, number>>(new Map());

  useEffect(() => {
    const syncScrollState = () => {
      const nextScrolled = window.scrollY > 24;

      setHasScrolled(nextScrolled);

      if (!nextScrolled) {
        visibleRatiosRef.current.clear();
        setActiveSection(null);
      }
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncScrollState);
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        setIsMobileMenuOpen(false);
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isMobileMenuOpen) {
      document.body.style.overflow = SCROLL_LOCK_STYLES.overflow;
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (window.scrollY <= 24) {
          visibleRatiosRef.current.clear();
          setActiveSection(null);
          return;
        }

        for (const entry of entries) {
          const sectionId = entry.target.id as SectionId;

          if (entry.isIntersecting) {
            visibleRatiosRef.current.set(sectionId, entry.intersectionRatio);
          } else {
            visibleRatiosRef.current.delete(sectionId);
          }
        }

        const mostVisibleSection = [...visibleRatiosRef.current.entries()].sort(
          (left, right) => right[1] - left[1],
        )[0]?.[0];

        setActiveSection(mostVisibleSection ?? null);
      },
      {
        rootMargin: "-28% 0px -52% 0px",
        threshold: [0.2, 0.35, 0.5, 0.75],
      },
    );

    for (const link of NAV_LINKS) {
      const section = document.getElementById(link.sectionId);

      if (section) {
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const linkClassName = useMemo(
    () =>
      (sectionId: SectionId) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          activeSection === sectionId &&
            "bg-slate-900/80 text-emerald-300 ring-1 ring-emerald-400/40",
        ),
    [activeSection],
  );

  const scrollToTop = () => {
    setActiveSection(null);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToInstall = () => {
    setActiveSection("install");
    setIsMobileMenuOpen(false);
    scrollToSectionById("install");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();

    const sectionId = getSectionFromHref(href);

    setActiveSection(sectionId);
    closeMobileMenu();
    scrollToSectionById(sectionId);
  };

  return (
    <nav
      aria-label="Primary"
      data-testid="site-nav"
      className={cn(
        "sticky top-0 z-[60] border-b transition-all duration-300",
        hasScrolled
          ? "border-slate-800/80 bg-slate-950/80 shadow-[0_20px_60px_-40px_rgba(2,6,23,0.95)] backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <button
          type="button"
          aria-label="Scroll to top"
          onClick={scrollToTop}
          className="rounded-full px-2 py-2 text-left font-mono text-lg font-semibold tracking-[0.24em] text-slate-50 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          mktg
        </button>

        <div
          data-testid="desktop-nav-links"
          className="hidden items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/40 px-2 py-1 min-[769px]:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeSection === link.sectionId ? "page" : undefined}
              className={linkClassName(link.sectionId)}
              onClick={(event) => handleNavLinkClick(event, link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 min-[769px]:flex">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900/80 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={scrollToInstall}
            className="rounded-full border border-emerald-400/40 bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Get Started
          </button>
        </div>

        <button
          type="button"
          aria-controls="mobile-nav-menu"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          data-testid="nav-toggle"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-slate-50 transition hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 min-[769px]:hidden"
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="flex flex-col gap-1.5">
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
                isMobileMenuOpen && "translate-y-2 rotate-45",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200",
                isMobileMenuOpen && "opacity-0",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
                isMobileMenuOpen && "-translate-y-2 -rotate-45",
              )}
            />
          </span>
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div
          id="mobile-nav-menu"
          role="dialog"
          aria-label="Mobile navigation menu"
          className="border-t border-slate-800/80 bg-slate-950/95 px-6 pb-6 pt-4 shadow-2xl backdrop-blur-xl min-[769px]:hidden"
        >
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={activeSection === link.sectionId ? "page" : undefined}
                className={linkClassName(link.sectionId)}
                onClick={(event) => handleNavLinkClick(event, link.href)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobileMenu}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={scrollToInstall}
              className="mt-2 rounded-full border border-emerald-400/40 bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Get Started
            </button>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
