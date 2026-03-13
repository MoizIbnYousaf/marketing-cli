import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { TerminalDemoSequence } from "@/lib/terminal-data";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export type TerminalAnimationConfig = {
  minCharacterDelay: number;
  maxCharacterDelay: number;
  commandPause: number;
  lineDelay: number;
  lineJitter: number;
};

const DEFAULT_ANIMATION_CONFIG: TerminalAnimationConfig = {
  minCharacterDelay: 40,
  maxCharacterDelay: 120,
  commandPause: 260,
  lineDelay: 105,
  lineJitter: 45,
};

type UseTerminalPlaybackOptions = {
  demo: TerminalDemoSequence;
  animationConfig?: Partial<TerminalAnimationConfig>;
  shellRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
};

export function useTerminalPlayback({
  demo,
  animationConfig,
  shellRef,
  panelRef,
}: UseTerminalPlaybackOptions) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [typedCommand, setTypedCommand] = useState("");
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const runVersionRef = useRef(0);

  const timings = useMemo(
    () => ({ ...DEFAULT_ANIMATION_CONFIG, ...animationConfig }),
    [animationConfig],
  );

  const clearTimers = useCallback(() => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }

    timeoutIdsRef.current = [];
    runVersionRef.current += 1;
  }, []);

  const resetPlayback = useCallback(() => {
    clearTimers();
    setTypedCommand("");
    setVisibleLineCount(0);
  }, [clearTimers]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const node = shellRef.current;

    if (!node || !("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [shellRef]);

  useEffect(() => {
    if (!hasEnteredViewport) {
      return undefined;
    }

    resetPlayback();

    if (prefersReducedMotion) {
      setTypedCommand(demo.command);
      setVisibleLineCount(demo.lines.length);
      return undefined;
    }

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(callback, delay);

      timeoutIdsRef.current.push(timeoutId);
    };

    const runVersion = runVersionRef.current;
    let elapsed = 0;

    for (let index = 0; index < demo.command.length; index += 1) {
      const variance = Math.max(0, timings.maxCharacterDelay - timings.minCharacterDelay);

      elapsed += timings.minCharacterDelay + Math.round(variance * Math.random());

      schedule(() => {
        if (runVersion !== runVersionRef.current) {
          return;
        }

        setTypedCommand(demo.command.slice(0, index + 1));
      }, elapsed);
    }

    elapsed += timings.commandPause;

    demo.lines.forEach((_, index) => {
      elapsed += timings.lineDelay + Math.round(timings.lineJitter * Math.random());

      schedule(() => {
        if (runVersion !== runVersionRef.current) {
          return;
        }

        setVisibleLineCount(index + 1);
      }, elapsed);
    });

    return () => {
      clearTimers();
    };
  }, [clearTimers, demo, hasEnteredViewport, prefersReducedMotion, resetPlayback, timings]);

  useEffect(() => {
    if (!panelRef.current) {
      return;
    }

    panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [panelRef, typedCommand, visibleLineCount]);

  return {
    hasEnteredViewport,
    prefersReducedMotion,
    resetPlayback,
    typedCommand,
    visibleLines: hasEnteredViewport ? demo.lines.slice(0, visibleLineCount) : [],
  };
}
