"use client";

import { useMemo, useState } from "react";

import { ScrollReveal } from "@/components/ScrollReveal";
import {
  SKILL_CATEGORIES,
  getSkillsForCategory,
  type SkillsCatalogCategory,
} from "@/lib/skills-catalog";
import { MARKETING_SKILL_COUNT } from "@/lib/site-stats";

const tierClassNames = {
  "must-have": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "nice-to-have": "border-slate-700/80 bg-slate-800/80 text-slate-300",
} as const;

export function SkillsCatalog() {
  const [activeCategory, setActiveCategory] = useState<SkillsCatalogCategory>("all");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const filteredSkills = useMemo(
    () => getSkillsForCategory(activeCategory),
    [activeCategory],
  );

  return (
    <section
      id="skills"
      aria-labelledby="skills-heading"
      className="scroll-mt-28 border-t border-slate-800/80 px-6 py-24 sm:px-10 lg:py-28"
    >
      <ScrollReveal className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="max-w-3xl space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
            Skills catalog
          </p>
          <div className="space-y-4">
            <h2
              id="skills-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
            >
              Browse the full playbook
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Explore all {MARKETING_SKILL_COUNT} skills by marketing layer — from
              brand foundations to lifecycle growth loops — and expand any skill to
              inspect its trigger keywords and dependencies.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/55 p-5 shadow-[0_24px_120px_-72px_rgba(16,185,129,0.35)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
                  Filter by category
                </p>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  Showing {filteredSkills.length} of {MARKETING_SKILL_COUNT} skills.
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Responsive by default, with a scrollable tab row on mobile.
              </p>
            </div>

            <div data-skills-tabs className="overflow-x-auto pb-1">
              <div
                role="tablist"
                aria-label="Skill categories"
                className="flex min-w-max gap-3"
              >
                {SKILL_CATEGORIES.map((category) => {
                  const isActive = activeCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      id={`skills-tab-${category.id}`}
                      type="button"
                      role="tab"
                      aria-controls="skills-panel"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setExpandedSkill(null);
                      }}
                      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        isActive
                          ? "border-emerald-400/50 bg-emerald-400/12 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                          : "border-slate-700/80 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                      }`}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              id="skills-panel"
              role="tabpanel"
              aria-labelledby={`skills-tab-${activeCategory}`}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="rounded-full border border-slate-700/80 bg-slate-950/70 px-3 py-1 font-mono text-xs uppercase tracking-[0.24em] text-slate-300">
                  {SKILL_CATEGORIES.find((category) => category.id === activeCategory)?.label}
                </span>
                <span>Click a card to reveal trigger keywords and dependencies.</span>
              </div>

              <div
                data-skills-grid
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredSkills.map((skill) => {
                  const isExpanded = expandedSkill === skill.slug;

                  return (
                    <article
                      key={skill.slug}
                      data-skill-card
                      className="group rounded-[1.5rem] border border-slate-800 bg-slate-950/85 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/35 hover:shadow-[0_24px_80px_-48px_rgba(16,185,129,0.45)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="font-mono text-base font-medium text-slate-100">
                            {skill.name}
                          </p>
                          <p className="text-sm text-slate-400">{skill.categoryLabel}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${tierClassNames[skill.tier]}`}
                        >
                          {skill.tier}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-300">{skill.summary}</p>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {skill.triggers.slice(0, 2).map((trigger) => (
                            <span
                              key={`${skill.slug}-${trigger}`}
                              className="rounded-full border border-slate-700/70 bg-slate-900 px-2.5 py-1 text-xs text-slate-400"
                            >
                              {trigger}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`skill-details-${skill.slug}`}
                          aria-label={`${isExpanded ? "Hide" : "Show"} details for ${skill.slug}`}
                          onClick={() => setExpandedSkill(isExpanded ? null : skill.slug)}
                          className="min-h-11 rounded-full border border-slate-700/80 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition duration-200 hover:border-emerald-400/35 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {isExpanded ? "Hide details" : "Show details"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div
                          id={`skill-details-${skill.slug}`}
                          className="mt-4 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4"
                        >
                          <div className="space-y-2">
                            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">
                              Trigger keywords
                            </p>
                            <p className="text-sm leading-6 text-slate-300">
                              {skill.triggers.join(", ")}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">
                              Dependencies
                            </p>
                            <p className="text-sm leading-6 text-slate-300">
                              {skill.dependencies.length > 0
                                ? skill.dependencies.join(", ")
                                : "None — ready to use on its own."}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
