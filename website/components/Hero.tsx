"use client";

import type { MouseEvent } from "react";

import { scrollToSectionById } from "@/lib/scroll";

const heroCapabilities = [
  {
    label: "Brand memory",
    description: "Compounding context that keeps voice, positioning, and launch learnings in one place.",
  },
  {
    label: "Parallel research",
    description: "Dedicated agents map audiences, scan competitors, and sharpen your message in parallel.",
  },
  {
    label: "Composable skills",
    description: "A full marketing system your AI agent can chain into campaigns, content, and growth loops.",
  },
] as const;

const heroSignals = [
  "35 skills across strategy, copy, SEO, creative, and conversion",
  "CLI infrastructure for install, health checks, and autonomous updates",
  "Built for agents first, with human-friendly polish where it matters",
] as const;

export function Hero() {
  const handlePrimaryCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToSectionById("install");
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden px-6 pb-20 pt-12 sm:px-10 sm:pb-24 lg:pb-28 lg:pt-16"
    >
      <div
        data-hero-glow
        aria-hidden="true"
        className="absolute inset-x-0 top-[-10rem] -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.26),transparent_46%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%)] blur-2xl"
      />
      <div
        data-hero-glow
        aria-hidden="true"
        className="absolute right-[-6rem] top-32 -z-10 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl"
      />
      <div
        data-hero-glow
        aria-hidden="true"
        className="absolute bottom-12 left-[-5rem] -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
      />

      <div
        data-testid="hero-layout"
        className="mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-6xl gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center"
      >
        <div className="relative z-10 flex max-w-3xl flex-col justify-center gap-8 py-8 sm:py-12">
          <span className="w-fit rounded-full border border-emerald-400/20 bg-slate-900/75 px-4 py-2 font-mono text-xs uppercase tracking-[0.32em] text-emerald-300 shadow-[0_0_0_1px_rgba(15,23,42,0.35)]">
            agent-native marketing playbook
          </span>

          <div className="space-y-6">
            <h1
              id="hero-heading"
              className="max-w-4xl text-balance font-mono text-5xl font-semibold tracking-tight text-slate-50 sm:text-6xl lg:text-7xl"
            >
              One install for your agent&apos;s full CMO brain.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Give AI agents the marketing system they need to research, position,
              launch, and compound growth with brand memory, parallel research, and
              reusable campaign skills built into one workflow.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a
              href="#install"
              onClick={handlePrimaryCtaClick}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 transition duration-200 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Get Started
            </a>
            <a
              href="https://github.com/moizibnyousaf/mktg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-6 py-3 text-base font-semibold text-slate-100 transition duration-200 hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              View on GitHub
            </a>
          </div>

          <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 sm:text-base">
            {heroSignals.map((signal) => (
              <li key={signal} className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/45 px-4 py-3 backdrop-blur-sm sm:last:col-span-2">
                <span
                  aria-hidden="true"
                  className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.6)]"
                />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/75 p-6 shadow-[0_30px_120px_-60px_rgba(16,185,129,0.45)] backdrop-blur-xl sm:p-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%)]"
            />
            <div className="relative space-y-8">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="ml-3 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1 font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                  mktg init
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-300">
                  What ships with one install
                </p>
                <p className="text-2xl font-semibold tracking-tight text-slate-50">
                  A marketing operating system for autonomous agents.
                </p>
                <p className="text-base leading-7 text-slate-300">
                  From first-touch positioning to launch content and lifecycle growth,
                  mktg gives your agent the workflows, memory, and tooling to market
                  like a real team.
                </p>
              </div>

              <div className="space-y-4">
                {heroCapabilities.map((capability) => (
                  <div
                    key={capability.label}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-base font-semibold text-slate-100">
                        {capability.label}
                      </p>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">
                        included
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {capability.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
