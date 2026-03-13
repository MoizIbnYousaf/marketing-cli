"use client";

import { useEffect, useRef, useState } from "react";

import { ScrollReveal } from "@/components/ScrollReveal";

const INSTALL_COMMAND = "bun install -g mktg && mktg init";
const CTA_URL = "https://github.com/moizibnyousaf/mktg";

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Install",
    description:
      "Run one command to drop the playbook into your workflow with zero manual setup rituals.",
  },
  {
    number: "2",
    title: "Init",
    description:
      "mktg scaffolds your brand memory, installs the skills, and checks that the environment is ready.",
  },
  {
    number: "3",
    title: "Let your agent market",
    description:
      "Hand the brief to your agent and let it research, position, and ship campaigns with context intact.",
  },
] as const;

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to a textarea-based copy path for browsers where clipboard
      // permissions are unavailable (for example during local automation).
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";

  document.body.appendChild(textArea);

  try {
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    return typeof document.execCommand === "function" && document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

export function InstallCTA() {
  const [copyLabel, setCopyLabel] = useState("Copy");
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleCopy = async () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    try {
      const didCopy = await copyText(INSTALL_COMMAND);
      setCopyLabel(didCopy ? "Copied!" : "Copy failed");
    } catch {
      setCopyLabel("Copy failed");
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopyLabel("Copy");
    }, 2200);
  };

  return (
    <section
      id="install"
      aria-labelledby="install-heading"
      className="scroll-mt-28 border-t border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.7),rgba(15,23,42,0.96)_24%,rgba(2,6,23,1))] px-6 py-24 sm:px-10 lg:py-28"
    >
      <ScrollReveal className="mx-auto flex w-full max-w-6xl flex-col gap-12 rounded-[2rem] border border-slate-800/80 bg-slate-950/80 p-8 shadow-[0_30px_120px_-60px_rgba(16,185,129,0.45)] backdrop-blur-xl sm:p-10 lg:gap-16 lg:p-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-start">
          <div className="space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
              Install
            </p>
            <div className="space-y-4">
              <h2
                id="install-heading"
                className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
              >
                Install once. Let your agent take marketing from there.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                The whole promise of mktg lives in one install flow: bootstrap the
                playbook, spin up the brand memory, and give your agent a system it can
                actually run.
              </p>
            </div>
          </div>

          <div
            data-install-command-panel
            className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-5 shadow-[0_24px_80px_-48px_rgba(16,185,129,0.5)]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_38%)]"
            />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">
                    terminal
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Copy install command"
                  onClick={handleCopy}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition duration-200 hover:border-emerald-300/40 hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {copyLabel}
                </button>
              </div>

              <div className="rounded-[1.35rem] border border-slate-800/80 bg-slate-900/80 px-5 py-6 sm:px-6 sm:py-7">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                  Quick start
                </p>
                <code className="mt-4 block overflow-x-auto font-mono text-2xl font-semibold tracking-tight text-slate-50 sm:text-[2rem]">
                  {INSTALL_COMMAND}
                </code>
              </div>

              <p aria-live="polite" className="text-sm text-slate-400">
                Copy the exact command, drop it into your terminal, and let the setup do
                the heavy lifting.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-300">
              How it works
            </p>
            <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Three steps, always in order, from first install to a working marketing
              system your agent can keep compounding.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <li
                key={step.number}
                data-install-step
                className="flex h-full flex-col gap-4 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.95)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/12 font-mono text-sm font-semibold text-emerald-200">
                    {step.number}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                    Step {step.number}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-50">{step.title}</h3>
                  <p className="text-sm leading-7 text-slate-300 sm:text-base">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-800/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Ready to hand the boring parts of marketing to an agent that actually keeps
            context?
          </p>
          <a
            href={CTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 transition duration-200 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Install mktg now
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
