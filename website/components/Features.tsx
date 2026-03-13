import type { SVGProps } from "react";

import { ScrollReveal } from "@/components/ScrollReveal";
import { MARKETING_SKILL_COUNT } from "@/lib/site-stats";

type FeatureIconProps = SVGProps<SVGSVGElement> & {
  "data-feature-icon"?: string;
};

type FeatureItem = {
  title: string;
  description: string;
  iconId: string;
  Icon: (props: FeatureIconProps) => React.JSX.Element;
};

const iconClassName = "h-6 w-6 stroke-[1.7]";

function AgentNativeIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="7" width="14" height="10" rx="3" className={iconClassName} />
      <path d="M12 3v2" className={iconClassName} />
      <path d="M8 21h8" className={iconClassName} />
      <path d="M9 11h.01" className={iconClassName} />
      <path d="M15 11h.01" className={iconClassName} />
      <path d="M9 14c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2" className={iconClassName} />
    </svg>
  );
}

function SelfBootstrappingIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v6" className={iconClassName} />
      <path d="m8.5 6.5 3.5-3.5 3.5 3.5" className={iconClassName} />
      <path d="M7 13.5 4.5 11 2 13.5" className={iconClassName} />
      <path d="M17 13.5 19.5 11l2.5 2.5" className={iconClassName} />
      <path d="M4.5 11V8.5C4.5 7.1 5.6 6 7 6h10c1.4 0 2.5 1.1 2.5 2.5V11" className={iconClassName} />
      <path d="M12 21v-6" className={iconClassName} />
      <path d="M8 17.5 12 21l4-3.5" className={iconClassName} />
    </svg>
  );
}

function SkillsIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1.5" className={iconClassName} />
      <rect x="14" y="4" width="6" height="6" rx="1.5" className={iconClassName} />
      <rect x="4" y="14" width="6" height="6" rx="1.5" className={iconClassName} />
      <path d="M17 14v6" className={iconClassName} />
      <path d="M14 17h6" className={iconClassName} />
    </svg>
  );
}

function BrandMemoryIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H19v15.5A2.5 2.5 0 0 0 16.5 16H6z" className={iconClassName} />
      <path d="M6 5.5V21" className={iconClassName} />
      <path d="M9 7.5h7" className={iconClassName} />
      <path d="M9 11h6" className={iconClassName} />
      <path d="m14.5 16.5-2-1.4-2 1.4v-4h4z" className={iconClassName} />
    </svg>
  );
}

function ParallelResearchIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="5" r="2.5" className={iconClassName} />
      <circle cx="5" cy="18" r="2.5" className={iconClassName} />
      <circle cx="19" cy="18" r="2.5" className={iconClassName} />
      <path d="M10.2 6.9 6.8 15.1" className={iconClassName} />
      <path d="M13.8 6.9 17.2 15.1" className={iconClassName} />
      <path d="M7.5 18h9" className={iconClassName} />
    </svg>
  );
}

function ComposableIcon(props: FeatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 9.5V7a2 2 0 0 1 2-2h2.5" className={iconClassName} />
      <path d="M17 14.5V17a2 2 0 0 1-2 2h-2.5" className={iconClassName} />
      <path d="M14.5 7H17a2 2 0 0 1 2 2v2.5" className={iconClassName} />
      <path d="M9.5 17H7a2 2 0 0 1-2-2v-2.5" className={iconClassName} />
      <rect x="8" y="8" width="8" height="8" rx="2" className={iconClassName} />
      <path d="M12 5.5v1.5" className={iconClassName} />
      <path d="M12 17v1.5" className={iconClassName} />
      <path d="M5.5 12H7" className={iconClassName} />
      <path d="M17 12h1.5" className={iconClassName} />
    </svg>
  );
}

export const FEATURE_ITEMS: FeatureItem[] = [
  {
    title: "Agent-Native",
    description:
      "Built for AI agents, not humans — predictable primitives, structured output, and zero hand-holding.",
    iconId: "agent-native",
    Icon: AgentNativeIcon,
  },
  {
    title: "Self-Bootstrapping",
    description:
      "One command with mktg init scaffolds the brand memory, installs skills, and verifies the environment.",
    iconId: "self-bootstrapping",
    Icon: SelfBootstrappingIcon,
  },
  {
    title: `${MARKETING_SKILL_COUNT} Marketing Skills`,
    description:
      "A full CMO knowledge base spanning strategy, SEO, copy, creative, conversion, and growth workflows.",
    iconId: "marketing-skills",
    Icon: SkillsIcon,
  },
  {
    title: "Brand Memory",
    description:
      "The brand/ directory compounds voice, positioning, and launch context across every future session.",
    iconId: "brand-memory",
    Icon: BrandMemoryIcon,
  },
  {
    title: "Parallel Research",
    description:
      "Three dedicated agents research audience, positioning, and competitors at the same time.",
    iconId: "parallel-research",
    Icon: ParallelResearchIcon,
  },
  {
    title: "Composable",
    description:
      "Skills are Lego blocks and orchestrators are recipes, so your agent can remix proven workflows fast.",
    iconId: "composable",
    Icon: ComposableIcon,
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-t border-slate-800/80 px-6 py-24 sm:px-10 lg:py-28"
    >
      <ScrollReveal className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="max-w-3xl space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
            Features
          </p>
          <div className="space-y-4">
            <h2
              id="features-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
            >
              Why agents ship faster with mktg
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              From first install to repeatable launches, mktg gives autonomous workflows
              the memory, orchestration, and reusable marketing knowledge they need to
              move without losing the plot.
            </p>
          </div>
        </div>

        <div
          data-features-grid
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURE_ITEMS.map(({ title, description, iconId, Icon }) => (
            <article
              key={title}
              data-feature-card
              className="group relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/45 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_24px_80px_-42px_rgba(52,211,153,0.45)]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.12),transparent_48%)] opacity-0 transition duration-300 group-hover:opacity-100"
              />

              <div className="relative flex flex-col gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-slate-950/80 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.12)]">
                  <Icon data-feature-icon={iconId} aria-hidden="true" className={iconClassName} />
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-50">
                    {title}
                  </h3>
                  <p className="text-base leading-7 text-slate-300">{description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
