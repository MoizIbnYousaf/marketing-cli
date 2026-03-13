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

export function ScrollReveal({
  children,
  className,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.01,
}: ScrollRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setHasEnteredViewport(true);
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    const node = elementRef.current;

    if (!node || !("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && entry.intersectionRatio >= threshold) {
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
  }, [prefersReducedMotion, rootMargin, threshold]);

  const isVisible = prefersReducedMotion || hasEnteredViewport;

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
