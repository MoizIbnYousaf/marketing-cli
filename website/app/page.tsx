import { Nav } from "@/components/Nav";

const placeholderSections = [
  {
    id: "features",
    title: "Features",
    description: "Agent-native workflows, composable skills, and brand memory — all in one place.",
  },
  {
    id: "skills",
    title: "Skills",
    description: "A growing catalog of marketing skills your agent can use immediately.",
  },
  {
    id: "testimonials",
    title: "Testimonials",
    description: "Proof, social credibility, and launch stories will live here next.",
  },
  {
    id: "install",
    title: "Install",
    description: "Everything points back to a simple install flow: bootstrap once, then let your agent run.",
  },
];

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative isolate flex min-h-screen items-center overflow-hidden px-6 py-24 sm:px-10">
          <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%)]" />
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <span className="w-fit rounded-full border border-slate-800/80 bg-slate-900/70 px-4 py-2 font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
              agent-native marketing playbook
            </span>
            <div className="space-y-6">
              <h1 className="max-w-3xl font-mono text-5xl font-semibold tracking-tight text-slate-100 sm:text-7xl">
                mktg
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                One install for the full CMO brain — brand memory, orchestrated skills,
                and agent-ready marketing workflows.
              </p>
            </div>
          </div>
        </section>

        {placeholderSections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="flex min-h-screen scroll-mt-28 items-center border-t border-slate-800/80 px-6 py-28 sm:px-10"
          >
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800/80 bg-slate-900/55 p-10 shadow-[0_24px_120px_-72px_rgba(16,185,129,0.4)] backdrop-blur-sm">
              <p className="font-mono text-sm uppercase tracking-[0.3em] text-emerald-300">
                section {section.id}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
                {section.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                {section.description}
              </p>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
