import { Footer } from "@/components/Footer";
import { Features } from "@/components/Features";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { SkillsCatalog } from "@/components/SkillsCatalog";
import { Testimonials } from "@/components/Testimonials";
import { TerminalDemo } from "@/components/TerminalDemo";

const placeholderSections = [
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
        <Hero />
        <TerminalDemo />
        <Features />
        <SkillsCatalog />
        <Testimonials />

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
      <Footer />
    </>
  );
}
