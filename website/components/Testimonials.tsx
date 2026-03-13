import { ScrollReveal } from "@/components/ScrollReveal";

type Testimonial = {
  name: string;
  role: string;
  initials: string;
  quote: string;
  avatarClassName: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Avery Chen",
    role: "Founder, automation studio",
    initials: "AC",
    quote:
      "mktg gave our agent an actual operating system for launches. Instead of rewriting the brief every week, it picked up our voice and kept shipping on-brand assets.",
    avatarClassName: "border-emerald-400/35 bg-emerald-500/20 text-emerald-100",
  },
  {
    name: "Maya Patel",
    role: "Growth lead, SaaS portfolio",
    initials: "MP",
    quote:
      "The best part is the compounding memory. We can hand a new campaign to the agent and it already knows the audience, the objections, and the positioning that worked last month.",
    avatarClassName: "border-sky-400/35 bg-sky-500/20 text-sky-100",
  },
  {
    name: "Jordan Lee",
    role: "Indie hacker shipping solo",
    initials: "JL",
    quote:
      "It feels like hiring a tiny marketing team that never loses context. I get strategy, copy, and distribution ideas without leaving the terminal.",
    avatarClassName: "border-violet-400/35 bg-violet-500/20 text-violet-100",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="scroll-mt-28 border-t border-slate-800/80 px-6 py-24 sm:px-10 lg:py-28"
    >
      <ScrollReveal className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="max-w-3xl space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
            Testimonials
          </p>
          <div className="space-y-4">
            <h2
              id="testimonials-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl"
            >
              What people are saying
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Placeholder social proof, styled the same way the product ships: dark,
              crisp, and ready to swap for real customer stories the moment they land.
            </p>
          </div>
        </div>

        <div
          data-testimonials-grid
          className="grid grid-cols-1 items-stretch gap-5 lg:auto-rows-fr lg:grid-cols-3"
        >
          {TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.name}
              data-testimonial-card
              className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/45 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_24px_80px_-42px_rgba(52,211,153,0.45)]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.1),transparent_50%)] opacity-0 transition duration-300 group-hover:opacity-100"
              />

              <figure className="relative flex h-full flex-col gap-6">
                <div
                  data-testimonial-avatar
                  aria-hidden="true"
                  className={`flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold tracking-[0.16em] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)] ${testimonial.avatarClassName}`}
                >
                  {testimonial.initials}
                </div>

                <blockquote className="text-lg leading-8 text-slate-100">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                <figcaption className="mt-auto border-t border-slate-800/80 pt-5">
                  <p className="text-base font-semibold text-slate-100">{testimonial.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{testimonial.role}</p>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
