"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { TERMINAL_DEMOS, type TerminalLine, type TerminalTone } from "@/lib/terminal-data";
import type { TerminalAnimationConfig } from "@/lib/use-terminal-playback";
import { useTerminalPlayback } from "@/lib/use-terminal-playback";

type TerminalDemoProps = {
  animationConfig?: Partial<TerminalAnimationConfig>;
};

const PANEL_ID = "terminal-demo-panel";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const toneClasses: Record<TerminalTone, string> = {
  default: "text-slate-200",
  success: "text-emerald-300",
  warning: "text-amber-300",
  error: "text-rose-300",
  muted: "text-slate-400",
  dim: "text-slate-500",
};

function TerminalOutputLine({ line }: { line: TerminalLine }) {
  return (
    <p className="whitespace-pre-wrap break-words leading-6 text-slate-200">
      {line.segments.map((segment, index) => (
        <span
          key={`${line.id}-${index}`}
          className={cn(
            toneClasses[segment.tone ?? "default"],
            segment.emphasis === "strong" && "font-semibold text-slate-50",
            segment.emphasis === "dim" && "text-slate-500",
          )}
        >
          {segment.text}
        </span>
      ))}
    </p>
  );
}

export function TerminalDemo({ animationConfig }: TerminalDemoProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeDemo = TERMINAL_DEMOS[activeIndex];
  const {
    prefersReducedMotion,
    resetPlayback,
    typedCommand,
    visibleLines,
  } = useTerminalPlayback({
    demo: activeDemo,
    animationConfig,
    panelRef,
    shellRef,
  });

  const activateTab = (nextIndex: number) => {
    if (nextIndex === activeIndex) {
      return;
    }

    resetPlayback();
    setActiveIndex(nextIndex);
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = TERMINAL_DEMOS.length - 1;

    let nextIndex = index;

    if (event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      aria-labelledby="terminal-demo-heading"
      className="relative border-y border-slate-800/80 px-4 py-18 sm:px-6 sm:py-22 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="max-w-3xl space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
            terminal replay
          </p>
          <div className="space-y-4">
            <h2
              id="terminal-demo-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
            >
              Watch mktg go from one install to a working marketing operator.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Three pre-recorded CLI demos show the exact bootstrap, status, and doctor
              flows your agent runs when it takes over marketing end to end.
            </p>
          </div>
        </div>

        <div
          ref={shellRef}
          role="region"
          aria-label="Animated terminal demo showing mktg CLI output"
          data-testid="terminal-shell"
          className="w-full overflow-hidden rounded-[1.75rem] border border-slate-800/90 bg-slate-950/90 font-mono shadow-[0_32px_130px_-70px_rgba(16,185,129,0.45)]"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              {[
                "bg-rose-400",
                "bg-amber-300",
                "bg-emerald-400",
              ].map((className) => (
                <span
                  key={className}
                  data-terminal-dot
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-full ${className}`}
                />
              ))}
            </div>
            <p className="truncate px-4 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              {activeDemo.windowTitle}
            </p>
            <span aria-hidden="true" className="w-12" />
          </div>

          <div
            role="tablist"
            aria-label="CLI demos"
            className="grid grid-cols-3 gap-2 border-b border-slate-800/80 bg-slate-950/80 p-3"
          >
            {TERMINAL_DEMOS.map((demo, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={demo.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  id={`terminal-demo-tab-${demo.id}`}
                  type="button"
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-controls={PANEL_ID}
                  aria-selected={isActive}
                  onClick={() => activateTab(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={cn(
                    "min-h-11 rounded-2xl border px-3 py-2.5 text-center text-[12px] font-medium tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:text-[13px]",
                    isActive
                      ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]"
                      : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-slate-100",
                  )}
                >
                  {demo.label}
                </button>
              );
            })}
          </div>

          <div
            ref={panelRef}
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`terminal-demo-tab-${activeDemo.id}`}
            data-testid="terminal-panel"
            className="max-h-[24rem] min-h-[21rem] overflow-y-auto px-4 py-4 text-[12px] sm:px-6 sm:py-5 sm:text-[13px]"
          >
            <div aria-label="Terminal output" className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-slate-100">
                <span className="text-emerald-300">$</span>
                <span data-testid="terminal-command">{typedCommand}</span>
                <span
                  data-testid="terminal-cursor"
                  aria-hidden="true"
                  className={cn(
                    "inline-block h-5 w-2 rounded-[2px] bg-emerald-300 align-middle",
                    !prefersReducedMotion &&
                      "animate-[terminal-cursor-blink_1.06s_steps(2,start)_infinite]",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                {visibleLines.map((line) => (
                  <TerminalOutputLine key={line.id} line={line} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
