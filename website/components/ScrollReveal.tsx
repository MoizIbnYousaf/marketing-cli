"use client";

import { useEffect, useRef, useState, type PropsWithChildren } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type ScrollRevealProps = PropsWithChildren<{
  className?: string;
  rootMargin?: string;
  threshold?: number;
}>;

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const isNodeInViewport = (node: HTMLDivElement, threshold: number) => {
  if (typeof window === "undefined") {
    return false;
  }

  const rect = node.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
  );
  const visibleRatio = visibleHeight / Math.max(rect.height, 1);
  const isHorizontallyVisible = rect.right >= 0 && rect.left <= viewportWidth;

  return isHorizontallyVisible && visibleRatio >= threshold;
};

export function ScrollReveal({
  children,
  className,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.01,
}: ScrollRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isClientArmed, setIsClientArmed] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    if (hasEnteredViewport) {
      setIsClientArmed(false);
      return undefined;
    }

    const motionPreference =
      prefersReducedMotion ||
      (typeof window !== "undefined" && "matchMedia" in window
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false);

    if (motionPreference) {
      setIsClientArmed(false);
      setHasEnteredViewport(true);
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    const node = elementRef.current;

    if (!node || !("IntersectionObserver" in window)) {
      setIsClientArmed(false);
      setHasEnteredViewport(true);
      return undefined;
    }

    if (isNodeInViewport(node, threshold)) {
      setIsClientArmed(false);
      setHasEnteredViewport(true);
      return undefined;
    }

    setIsClientArmed(true);

    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && entry.intersectionRatio >= threshold) {
          setIsClientArmed(false);
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: [threshold] },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasEnteredViewport, prefersReducedMotion, rootMargin, threshold]);

  const isVisible = prefersReducedMotion || !isClientArmed || hasEnteredViewport;

  return (
    <div
      ref={elementRef}
      data-reveal-state={isVisible ? "visible" : "hidden"}
      className={cn(
        className,
        prefersReducedMotion
          ? "opacity-100"
          : "transform-gpu transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform]",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
    >
      {children}
    </div>
  );
}
